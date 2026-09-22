// Return text segments only: model output is never interpreted as HTML.
export function messageSegments(content) {
  return String(content).split('**').map((text,index)=>({text,bold:index%2===1})).filter(part=>part.text);
}
export function renderAssistantText(element, content) {
  element.replaceChildren();
  for(const part of messageSegments(content)) {
    if(part.bold){const strong=element.ownerDocument.createElement('strong');strong.textContent=part.text;element.append(strong);}
    else element.append(element.ownerDocument.createTextNode(part.text));
  }
}
