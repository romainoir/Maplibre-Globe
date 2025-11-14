const pad = (value) => String(value).padStart(2, '0');

const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

function dateFromYearAndDoy(year, doy) {
  const date = new Date(Date.UTC(year, 0, 1));
  date.setUTCDate(doy);
  return date;
}

function setLocalTime(date, minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  date.setHours(hours, mins, 0, 0);
  return date;
}

const minutesOfDayFromDate = (date) => date.getHours() * 60 + date.getMinutes();

function doyFromDate(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date - start) / 86400000) + 1;
}

const fmtDate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const fmtTime = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export {
  dateFromYearAndDoy,
  doyFromDate,
  fmtDate,
  fmtTime,
  isLeap,
  minutesOfDayFromDate,
  setLocalTime,
};
