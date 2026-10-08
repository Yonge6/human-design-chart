// Derived server-side per request. No full birth date/time/place is sent to AI.
export function ageContext(birthDate, now = new Date()) {
  if (typeof birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`);
  if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== birthDate) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
  const asOfDate = `${parts.year}-${parts.month}-${parts.day}`;
  if (birthDate > asOfDate) return null;
  const [by,bm,bd] = birthDate.split('-').map(Number);
  const y=Number(parts.year),m=Number(parts.month),d=Number(parts.day);
  // A February 29 birthday is reached on March 1 in non-leap years.
  const ageYears = y-by-Number(m<bm || (m===bm && d<bd));
  const result = {birthYear:by,ageYears,asOfDate,calendarTimeZone:'Asia/Shanghai'};
  if (ageYears===0) {
    result.ageMonths = Math.max(0,(y-by)*12+m-bm-Number(d<bd));
    result.ageDays = Math.floor((Date.parse(`${asOfDate}T00:00:00Z`)-birth.getTime())/86400000);
  }
  return result;
}
