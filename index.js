const puppeteer = require('puppeteer');


const searches = [
  {
    dep: 'BOD',
    arr: 'TUN',
    depDate: '29.08.2025',
    retDate: '09.09.2025',
    currency: 'EUR'
  },
  {
    dep: 'BOD',
    arr: 'TUN',
    depDate: '02.09.2025',
    retDate: '12.09.2025',
    currency: 'EUR'
  }
];


const PASSENGERS = [
  { passengerType: 'ADULT', quantity: 1 },
  { passengerType: 'CHILD', quantity: 0 },
  { passengerType: 'INFANT', quantity: 0 }
];


function buildAvailabilityUrl({ dep, arr, depDate, retDate, currency }) {
  const params = new URLSearchParams();


  params.set('tripType', 'ROUND_TRIP');
  PASSENGERS.forEach((p, idx) => {
    params.set(`passengerQuantities[${idx}].passengerType`, p.passengerType);
    params.set(`passengerQuantities[${idx}].quantity`, p.quantity);
  });
  params.set('currency', currency);
  params.set('depPort', dep);
  params.set('arrPort', arr);
  params.set('departureDate', depDate);
  params.set('returnDate', retDate);
  params.set('lang', 'fr');
  params.set('withCalendar', 'false');


  return `https://booking.nouvelair.com/ibe/availability?${params.toString()}`;
}


(async () => {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();


  // Initialiser la session
  await page.goto('https://booking.nouvelair.com/ibe/', { waitUntil: 'networkidle2' });
  try {
    await page.click('#onetrust-accept-btn-handler', { timeout: 3000 });
  } catch (e) {}


  const allResults = [];


  for (const s of searches) {
    const url = buildAvailabilityUrl(s);
    console.log(`🔍 Recherche ${s.dep} → ${s.arr} | ${s.depDate} → ${s.retDate}`);
    console.log(`➡️ URL: ${url}`);


    await page.goto(url, { waitUntil: 'networkidle2' });


    try {
      await page.waitForSelector('.js-scheduled-flight', { timeout: 20000 });


      const vols = await page.evaluate(() => {
        const results = [];
        const cards = document.querySelectorAll('.js-scheduled-flight');


        cards.forEach(card => {
          let c = 0;
          const date = card.querySelector('.date')?.textContent?.trim();
          const prix = card.querySelector('.price-best-offer')?.textContent?.trim();
          const airport = card.querySelectorAll('.port');


          let depart, arriver;


          airport.forEach(port => {
            if (c === 0) {
              depart = port?.textContent?.trim();
            } else {
              arriver = port?.textContent?.trim();
            }
            c++;
          });


          results.push({
            date,
            depart,
            arriver,
            prix
          });
        });


        return results;
      });


      console.table(vols);
      allResults.push({ search: s, vols });


    } catch (e) {
      console.error('❌ Résultats non trouvés ou erreur DOM.');
    }
  }


  await browser.close();
})();
