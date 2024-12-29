
interface thetimes {
  sunrise: string;
  sunset: string;
}

interface SunriseSunsetData {
  date: string;
  weekday: string;
  times: thetimes[];
}

function decimalToHHMMSS(decimalHours: number): string {
  const hours = Math.floor(decimalHours);
  const minutes = Math.floor((decimalHours - hours) * 60);
  const seconds = Math.floor(((decimalHours - hours) * 60 - minutes) * 60);

  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}


function suntimes(lat: number, lng: number, tz: number, d: Date): [snr: string, sns: string] {
  // algorithm from https://en.wikipedia.org/wiki/Sunrise_equation
  var radians = Math.PI / 180.0;
  var degrees = 180.0 / Math.PI;

  var a = Math.floor((14 - (d.getMonth() + 1.0)) / 12)
  var y = d.getFullYear() + 4800 - a;
  var m = (d.getMonth() + 1) + 12 * a - 3;
  var julianDay = d.getDate() + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  var meanSolarTime = julianDay - 2451545.0008 - lng / 360.0;
  var n = Math.floor(meanSolarTime + 0.5);
  var solarNoon = 2451545.0009 - lng / 360.0 + n;
  var SolarMeanAnomaly = 357.5291 + 0.98560028 * n;
  var C = 1.9148 * Math.sin(SolarMeanAnomaly * radians) + 0.02 * Math.sin(2 * SolarMeanAnomaly * radians) + 0.0003 * Math.sin(3 * SolarMeanAnomaly * radians);
  var L = (SolarMeanAnomaly + 102.9372 + C + 180) % 360;
  var solarTransit = solarNoon + 0.0053 * Math.sin(SolarMeanAnomaly * radians) - 0.0069 * Math.sin(2 * L * radians);
  var D = Math.asin(Math.sin(L * radians) * Math.sin(23.4387 * radians)) * degrees;
  var cos_omega = (Math.sin(-0.833 * radians) - Math.sin(lat * radians) * Math.sin(D * radians)) / (Math.cos(lat * radians) * Math.cos(D * radians));

  // kaamos
  if (cos_omega > 1)
    return ["‾‾o‾‾", "‾‾o‾‾"];

  // yötön yö
  if (cos_omega < -1)
    return ["__o__", "__o__"];

  // sunrise sunset times
  var omega = Math.acos(cos_omega) * degrees;
  var sunriseTime = solarTransit - omega / 360.0;
  var sunsetTime = solarTransit + omega / 360.0;

  /*
  */
  var utcSunrise = 24 * (sunriseTime - julianDay) + 12;
  var utcSunset = 24 * (sunsetTime - julianDay) + 12;  // julian date starts at noon, hence the 12
  var timezoneOffset = tz === undefined ? -1 * d.getTimezoneOffset() / 60 : tz;
  let localSunrise: number = (utcSunrise + timezoneOffset) % 24;
  let localSunset: number = (utcSunset + timezoneOffset) % 24;
  let localSunrise_str: string = decimalToHHMMSS(localSunrise);
  let localSunset_str: string = decimalToHHMMSS(localSunset);
  return [localSunrise_str, localSunset_str];
}

const dates = [];

function fetchSunriseSunset(lat: number, lng: number, date: Date): { sunrise: string; sunset: string } {

  let times = suntimes(lat, lng, 2, date);
  return { sunrise: times[0], sunset: times[1] };
}

const locations = [
  { name: 'Helsinki', lat: 60.1695, lng: 24.9354 },
  { name: 'Vantaa', lat: 60.298, lng: 25.00664 },
  { name: 'Tampere', lat: 61.4980, lng: 23.7608 },
  { name: 'Ilmajoki', lat: 62.731944, lng: 22.580556 },
  { name: 'Oulu', lat: 65.0121, lng: 25.4651 },
  { name: 'Utsjoki', lat: 69.9078, lng: 27.0265 },
];

const weekdays = ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"];
const months = ["Tammikuu", "Helmikuu", "Maaliskuu", "Huhtikuu", "Toukokuu", "Kesäkuu", "Heinäkuu", "Elokuu", "Syyskuu", "Lokakuu", "Marraskuu", "Joulukuu"];

function getSunriseSunsetData(): SunriseSunsetData[] {
  const data: SunriseSunsetData[] = [];

  let startDate = Date.parse("2025-01-01");
  let endDate = Date.parse("2025-12-31");
  let monthNow: number = 0;
  for (let date = new Date(startDate);
    date <= new Date(endDate);
    date.setDate(date.getDate() + 1)) {
    let mn: number = date.getMonth();
    if (mn != monthNow) {
      const emptyElement: SunriseSunsetData = {
        date: months[mn],
        weekday: "",
        times: []
      };
      for (var i = 0; i < locations.length; i++) {
        emptyElement.times.push({ sunrise: "", sunset: "" });
      }

      data.push(emptyElement);
    }
    monthNow = mn;

    let dstring = date.toLocaleDateString("fi-FI");

    const newElement: SunriseSunsetData = {
      date: dstring,
      weekday: weekdays[date.getDay()],
      times: []
    }
    for (var i = 0; i < locations.length; i++) {
      newElement.times.push(fetchSunriseSunset(locations[i].lat, locations[i].lng, date));
    }

    data.push(newElement);
  }


  return data;
}

function addCells(row: HTMLTableRowElement, entries: SunriseSunsetData) {
  for (var i = 0; i < locations.length; i++) {
    const cellleft = row.insertCell();
    cellleft.innerText = entries.times[i].sunrise;
    cellleft.classList.add("leftcell")
    const cellright = row.insertCell();
    cellright.innerText = entries.times[i].sunset;
    cellright.classList.add("rightcell");
    if (entries.weekday.startsWith("Su")) {
      row.classList.add("sundayrow");
      cellleft.classList.add("sundayrow");
      cellright.classList.add("sundayrow");
    }
  }
}

async function renderTable(): Promise<void> {
  const data = getSunriseSunsetData();

  // Create a container element
  const container = document.createElement('div');
  container.id = 'table-container'; // Assign an ID for styling

  // Create a wrapper for the scrollable content
  const tableScroll = document.createElement('div');
  tableScroll.className = 'table-scroll';


  // Create the table element
  const table = document.createElement('table');
  table.id = 'my-table'; // Assign an ID for styling


  // Create the table header (thead)
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  var emptycell = document.createElement('th');
  emptycell.style.position = 'sticky';
  emptycell.style.top = '0';
  emptycell.classList.add("leftcell");
  headerRow.appendChild(emptycell);

  // Define column headers
  for (var i = 0; i < locations.length; i++) {
    const thName = document.createElement('th');
    const thLocation = document.createElement('th');

    thName.innerText = locations[i].name;
    thLocation.innerText = "" + locations[i].lat + "\n" + locations[i].lng;

    thName.style.position = 'sticky'; // Make it sticky
    thName.style.top = '0';           // Stick to the top
    thName.classList.add('leftcell');
    thLocation.style.position = 'sticky'; // Make it sticky
    thLocation.style.top = '0';           // Stick to the top
    thLocation.classList.add('rightcell');
    thLocation.classList.add('locationtitle');

    headerRow.appendChild(thName);
    headerRow.appendChild(thLocation);
  };
  const headerSecondRow = document.createElement('tr');
  const pvmPvmCell = document.createElement('th');
  pvmPvmCell.innerText = "Pvm";
  pvmPvmCell.classList.add("leftcell");
  pvmPvmCell.style.position = 'sticky'; // Make it sticky
  pvmPvmCell.style.top = '32px';           // Stick to the top
  headerSecondRow.appendChild(pvmPvmCell);

  // Define column headers
  for (var i = 0; i < locations.length; i++) {
    const thRise = document.createElement('th');
    const thSet = document.createElement('th');

    thRise.innerText = "Nousu";
    thSet.innerText = "Lasku";

    thRise.style.position = 'sticky'; // Make it sticky
    thRise.style.top = '32px';           // Stick to the top
    thRise.classList.add('leftcell');
    thSet.style.position = 'sticky'; // Make it sticky
    thSet.style.top = '32px';           // Stick to the top
    thSet.classList.add('rightcell');
    headerSecondRow.appendChild(thRise);
    headerSecondRow.appendChild(thSet);
  };

  thead.appendChild(headerRow);
  thead.appendChild(headerSecondRow);
  table.appendChild(thead);

  // Create the table body (tbody)
  const tbody = document.createElement('tbody');


  // Table rows
  for (const entry of data) {
    const row = document.createElement('tr');
    const datecell = row.insertCell();
    if (entry.weekday == "") {
      datecell.innerText = entry.date;
      datecell.classList.add("monthname");  
    } else {
      datecell.innerText = entry.weekday + " " + entry.date;
    }
    datecell.classList.add("leftcell");
    addCells(row, entry);

    if (entry.weekday.startsWith("Su")) {

      row.classList.add("sundayrow");
      datecell.classList.add("sundaycell");
    }
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  // Append table to the body
  // Append the table to the scroll wrapper
  tableScroll.appendChild(table);

  // Append the table to the container
  container.appendChild(tableScroll);
  // Append the container to the document body
  document.body.appendChild(container);

  // Adjust the height dynamically
  window.addEventListener('resize', () => {
    const headerHeight = thead.offsetHeight; // Calculate header height dynamically
    tableScroll.style.height = `${container.offsetHeight - headerHeight}px`;
  });

  // Trigger the resize event initially to set the height
  window.dispatchEvent(new Event('resize'));
}

// Initialize table rendering
renderTable();
