// No free text, user IDs, URLs, birth details or transaction identifiers.
export const CONSENT_KEY = 'buer-usage-consent-v1';
export const EVENTS = Object.freeze(['visit','screen','active_time','chat_request','chat_success','chat_error','chat_cancel','chat_latency','manual_request','manual_success','manual_error','assessment_saved','guide_request','guide_success','guide_error','story_saved','action_saved','action_completed','action_reviewed','share_request','share_success','share_error','membership_view','purchase_request','purchase_result','restore_result']);
const enums = {
  screen:['home','growth','profile','manual','overview','assessment','stories'],
  outcome:['active','pending','cancelled','inactive','error'],
  plan:['monthly','annual'],
};
export function usageEvent(name, fields = {}, surface = 'h5') {
  if (!EVENTS.includes(name) || !['h5','ios'].includes(surface) || !fields || typeof fields !== 'object' || Array.isArray(fields)) return null;
  const parameters = {schema_version:1,surface};
  for (const [key,value] of Object.entries(fields)) {
    if (enums[key]?.includes(value)) parameters[key]=value;
    else if (key==='value' && ['active_time','chat_latency'].includes(name) && typeof value==='number' && Number.isFinite(value) && value>0 && value<=120) parameters.value=Math.round(value*100)/100;
    else if (key==='answered' && name==='assessment_saved' && Number.isInteger(value) && value>=0 && value<=12) parameters.answered=value;
    else return null;
  }
  return {name:`buer_v1_${name}`,parameters};
}
