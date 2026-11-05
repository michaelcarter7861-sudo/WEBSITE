(() => {
  const config = {
    "profit-margin-calculator": {
      title:"Profit Margin Calculator", description:"Calculate gross profit and profit margin from your cost and selling price.",
      fields:[["cost","Unit cost","number",0.01],["price","Selling price","number",0.01]],
      calculate:v=>{if(v.price<=0||v.cost<0)throw Error("Selling price must be above zero and cost cannot be negative.");const profit=v.price-v.cost;return{main:profit,mainLabel:"Gross profit per unit",rows:[["Profit margin",pct(profit/v.price*100)],["Markup",pct(v.cost===0?0:profit/v.cost*100)],["Cost",money(v.cost)],["Selling price",money(v.price)]]};}
    },
    "markup-calculator": {
      title:"Markup Calculator",description:"Calculate markup percentage from cost and selling price, or calculate a selling price from a target markup.",
      fields:[["cost","Unit cost","number",0.01],["price","Selling price","number",0.01]],
      calculate:v=>{if(v.cost<=0||v.price<0)throw Error("Cost must be above zero and selling price cannot be negative.");const markup=(v.price-v.cost)/v.cost*100;return{main:markup,mainLabel:"Markup percentage",suffix:"%",rows:[["Gross profit",money(v.price-v.cost)],["Profit margin",pct(v.price===0?0:(v.price-v.cost)/v.price*100)],["Cost",money(v.cost)],["Selling price",money(v.price)] ]};}
    },
    "break-even-calculator": {
      title:"Break-even Calculator",description:"Estimate the number of units and revenue required to cover fixed and variable costs.",
      fields:[["fixed","Total fixed costs","number",0.01],["price","Selling price per unit","number",0.01],["variable","Variable cost per unit","number",0.01]],
      calculate:v=>{const contribution=v.price-v.variable;if(v.fixed<0||v.price<=0||v.variable<0)throw Error("Enter non-negative costs and a selling price above zero.");if(contribution<=0)throw Error("Selling price must be greater than variable cost to break even.");const units=Math.ceil(v.fixed/contribution);return{main:units,mainLabel:"Units to break even",suffix:" units",rows:[["Break-even revenue",money(units*v.price)],["Contribution per unit",money(contribution)],["Contribution margin",pct(contribution/v.price*100)],["Fixed costs",money(v.fixed)]]};}
    },
    "selling-price-calculator": {
      title:"Selling Price Calculator",description:"Find the selling price required to achieve your target profit margin.",
      fields:[["cost","Total unit cost","number",0.01],["margin","Target profit margin (%)","number",0.1]],
      calculate:v=>{if(v.cost<0||v.margin<0||v.margin>=100)throw Error("Cost cannot be negative. Target margin must be from 0% up to (but not including) 100%.");const price=v.cost/(1-v.margin/100);return{main:price,mainLabel:"Recommended selling price",rows:[["Unit cost",money(v.cost)],["Gross profit",money(price-v.cost)],["Target margin",pct(v.margin)],["Markup required",pct(v.cost===0?0:(price-v.cost)/v.cost*100)]]};}
    },
    "ecommerce-profit-calculator": {
      title:"Ecommerce Profit Calculator",description:"Estimate profit per order after product cost, shipping, marketplace fees, payment fees and advertising.",
      fields:[["price","Order revenue","number",0.01],["product","Product cost","number",0.01],["shipping","Shipping & fulfillment","number",0.01],["marketplace","Marketplace fee (%)","number",0.1],["payment","Payment fee (%)","number",0.1],["ads","Advertising cost per order","number",0.01]],
      calculate:v=>{if(v.price<=0||Object.entries(v).some(([k,n])=>k!=="price"&&n<0)||v.marketplace>100||v.payment>100)throw Error("Revenue must be above zero. Costs and fee percentages cannot be negative; fee percentages cannot exceed 100.");const market=v.price*v.marketplace/100,pay=v.price*v.payment/100,profit=v.price-v.product-v.shipping-market-pay-v.ads;return{main:profit,mainLabel:"Estimated profit per order",rows:[["Profit margin",pct(profit/v.price*100)],["Marketplace fee",money(market)],["Payment fee",money(pay)],["Total costs",money(v.product+v.shipping+market+pay+v.ads)],["Order revenue",money(v.price)]]};}
    }
  };
  const slug = document.body.dataset.calculator;
  const tool = config[slug];
  const form = document.querySelector("#calculator-form");
  if (!tool || !form) return;
  const inputs = Object.fromEntries(tool.fields.map(([key,label,type,step]) => [key,form.querySelector("#"+key)]));
  const result = document.querySelector("#result-output");
  const resultLabel = document.querySelector("#result-label");
  const rows = document.querySelector("#result-rows");
  const error = document.querySelector("#form-error");
  const currency = document.querySelector("#currency");
  const formatCurrency = amount => new Intl.NumberFormat(undefined,{style:"currency",currency:currency?.value||"USD",maximumFractionDigits:2}).format(amount);
  function money(n){return formatCurrency(n)}
  function pct(n){return Number.isFinite(n)?n.toFixed(2)+"%":"—"}
  function render(){
    error.textContent="";
    const values={};
    for(const [key,input] of Object.entries(inputs)){
      const raw=input.value.trim();
      if(raw===""){error.textContent="Complete every field to calculate your result.";input.focus();return;}
      const value=Number(raw);
      if(!Number.isFinite(value)){error.textContent="Enter valid numbers in every field.";input.focus();return;}
      values[key]=value;
    }
    try{
      const output=tool.calculate(values);
      result.textContent=output.suffix==="%"?output.main.toFixed(2)+"%":output.suffix===" units"?output.main.toLocaleString()+" units":formatCurrency(output.main);
      resultLabel.textContent=output.mainLabel;
      rows.innerHTML=output.rows.map(([label,value])=>"<div class=\"result-item\"><span>"+label+"</span><strong>"+value+"</strong></div>").join("");
      document.querySelector("#result-placeholder")?.setAttribute("hidden","");
      result.closest(".result-panel").classList.add("has-result");
    }catch(e){error.textContent=e.message;}
  }
  form.addEventListener("submit",event=>{event.preventDefault();render();});
  form.addEventListener("input",()=>{if(error.textContent)error.textContent="";});
  document.querySelector("#reset-button")?.addEventListener("click",()=>{form.reset();result.textContent="—";resultLabel.textContent="Your result will appear here";rows.innerHTML="";error.textContent="";document.querySelector("#result-placeholder")?.removeAttribute("hidden");});
  document.querySelector("#copy-result")?.addEventListener("click",async()=>{if(result.textContent==="—")return;const text=[tool.title,resultLabel.textContent+": "+result.textContent,...[...rows.querySelectorAll(".result-item")].map(x=>x.innerText.replace("\n",": "))].join("\n");try{await navigator.clipboard.writeText(text);const button=document.querySelector("#copy-result");button.textContent="Copied";setTimeout(()=>button.textContent="Copy result",1400);}catch{error.textContent="Clipboard access is unavailable in this browser.";}});

  const title = document.querySelector("#tool-title");
  if(title)title.textContent=tool.title;
  const description=document.querySelector("#tool-description");
  if(description)description.textContent=tool.description;
})();