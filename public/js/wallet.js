const KEY="zero.armory.v1";
const format=(n)=>Number(n||0).toLocaleString("pt-BR");
function refresh(){
  let data;
  try{data=JSON.parse(localStorage.getItem(KEY)||"null")}catch{}
  const coins=document.getElementById("lobby-coins"),gems=document.getElementById("lobby-gems");
  if(coins)coins.textContent=format(data?.coins??1200);
  if(gems)gems.textContent=format(data?.gems??40);
}
refresh();
window.addEventListener("storage",refresh);
window.addEventListener("pageshow",refresh);
