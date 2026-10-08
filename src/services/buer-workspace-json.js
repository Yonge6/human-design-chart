// Postgres JSONB does not retain object-key order. Compare values, not wire order.
export function stableJson(value){
 if(Array.isArray(value))return '['+value.map(stableJson).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableJson(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
