export const expenseCategories = ['Выплаты персоналу', 'Материалы', 'Товары для продажи', 'Аренда', 'Коммунальные услуги', 'Уборка и стирка', 'Реклама', 'Программы и связь', 'Банковские комиссии', 'Ремонт', 'Бухгалтерия', 'Налоги и взносы', 'Прочие расходы'];
export const serviceCategories = ['Парикмахерские услуги', 'Ногтевой сервис', 'Брови и ресницы', 'Макияж', 'Уходовые услуги', 'Продажа косметики', 'Аренда рабочих мест'];
export const labels = { payment: 'Оплата услуги', expense: 'Расход', transfer: 'Перевод', payout: 'Выплата мастеру', advance: 'Предоплата / сертификат', refund: 'Возврат', funding: 'Вложение / заём', withdrawal: 'Изъятие / возврат займа', investment: 'Оборудование', income: 'Прочее поступление' };
const LIMIT = 1_000_000_000_000;
export const currencyCatalog = [
  ['RUB', 'Российский рубль', '₽'],
  ['UZS', 'Узбекский сум', 'сум'],
  ['KZT', 'Казахстанский тенге', '₸'],
  ['USD', 'Доллар США', '$'],
  ['EUR', 'Евро', '€'],
  ['BYN', 'Белорусский рубль', 'BYN'],
  ['UAH', 'Украинская гривна', '₴'],
  ['GEL', 'Грузинский лари', '₾'],
  ['AMD', 'Армянский драм', '֏'],
  ['AZN', 'Азербайджанский манат', '₼'],
  ['KGS', 'Киргизский сом', 'KGS'],
  ['TJS', 'Таджикский сомони', 'TJS'],
  ['TRY', 'Турецкая лира', '₺'],
  ['AED', 'Дирхам ОАЭ', 'AED'],
  ['GBP', 'Британский фунт', '£'],
  ['CHF', 'Швейцарский франк', 'CHF'],
  ['PLN', 'Польский злотый', 'zł'],
  ['CZK', 'Чешская крона', 'Kč'],
  ['CNY', 'Китайский юань', 'CNY'],
  ['CAD', 'Канадский доллар', 'CA$'],
  ['AUD', 'Австралийский доллар', 'A$'],
  ['NZD', 'Новозеландский доллар', 'NZ$'],
  ['SGD', 'Сингапурский доллар', 'S$'],
  ['HKD', 'Гонконгский доллар', 'HK$'],
  ['THB', 'Таиландский бат', '฿'],
  ['INR', 'Индийская рупия', '₹'],
  ['ILS', 'Израильский шекель', '₪'],
  ['SAR', 'Саудовский риял', 'SAR'],
  ['QAR', 'Катарский риал', 'QAR'],
  ['RON', 'Румынский лей', 'RON'],
];
const currencies = currencyCatalog.map(([code]) => code);
export function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function check(ok, message) { if (!ok) throw new Error(message); }
function integer(n, zero = false) { check(Number.isSafeInteger(n) && n >= (zero ? 0 : 1) && n <= LIMIT, 'Укажите корректную сумму'); return n; }
function name(v) { check(typeof v === 'string' && v.trim().length > 0 && v.length <= 160, 'Введите название (до 160 символов)'); return v.trim(); }
function validDate(v) { check(typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v, 'Некорректная дата'); }
function find(items, id) { const item = items.find(x => x.id === id); check(item, 'Связанная запись не найдена'); return item; }
export function money(value) {
  const str = String(value).replace(/\s/g,'').replace(',','.');
  check(/^\d+(\.\d{1,2})?$/.test(str), 'Введите сумму, не более двух знаков после запятой');
  const [a,b=''] = str.split('.'); return integer(Number(a)*100 + Number(b.padEnd(2,'0')), true);
}
export function initialState() { return { version: 1, revision: 0, settings: { name: '', currency: 'RUB', configured: false }, accounts: [], masters: [], sales: [], entries: [], plans: [], credits: [], seen: [] }; }
export function creditBalance(s, id) {
  const c = find(s.credits,id);
  return c.amount - s.entries.filter(e=>e.creditId===id).reduce((n,e)=>n+(e.type==='payment'?e.amount:e.type==='refund'?-e.amount:0),0);
}
export function saleDue(s,id) {
  const sale=find(s.sales,id);
  const es=s.entries.filter(e=>e.saleId===id);
  return sale.net-es.filter(e=>e.type==='payment').reduce((n,e)=>n+e.amount,0);
}
export function masterTotals(s,id,to='9999-12-31') {
  const sales=s.sales.filter(x=>x.masterId===id&&x.date<=to);
  const earned=sales.reduce((n,x)=>{const refunded=s.entries.filter(e=>e.type==='refund'&&e.saleId===x.id&&e.date<=to).reduce((sum,e)=>sum+e.amount,0);return n+Math.round(x.commission*(x.net-refunded)/x.net);},0);
  const paid=s.entries.filter(e=>e.type==='payout'&&e.masterId===id&&e.date<=to).reduce((n,e)=>n+e.amount,0);
  return {earned,paid,due:earned-paid};
}
export function summary(s,from='0000-01-01',to='9999-12-31') {
  const accounts=s.accounts.map(a=>({...a,balance:a.opening}));
  let income=0,expense=0,other=0;
  for (const e of s.entries) {
    if (e.creditId) continue;
    const a=accounts.find(a=>a.id===e.accountId);
    const out=['expense','payout','refund','withdrawal','investment','transfer'].includes(e.type);
    const signed=out?-e.amount:e.amount;
    if(a) a.balance+=signed;
    if(e.type==='transfer') find(accounts,e.toAccountId).balance+=e.amount;
    if(e.date<from||e.date>to) continue;
    if(['payment','advance','income'].includes(e.type)) income+=e.amount;
    else if(e.type==='refund') income-=e.amount;
    else if(['expense','payout'].includes(e.type)) expense+=e.amount;
    else if(e.type!=='transfer') other+=signed;
  }
  return { accounts,balance:accounts.reduce((n,a)=>n+a.balance,0), income,expense,flow:income-expense,other,
    due:s.masters.reduce((n,m)=>n+Math.max(0,masterTotals(s,m.id).due),0),
    receivable:s.sales.reduce((n,x)=>n+saleDue(s,x.id),0),
    credits:s.credits.reduce((n,x)=>n+creditBalance(s,x.id),0) };
}
export function apply(state,a) {
  check(a && typeof a.id==='string' && a.id.length<=160,'Не задан идентификатор операции');
  if(state.seen.includes(a.id)) return state;
  const s=structuredClone(state), type=a.type;
  const entry={id:a.id,type,date:a.date,amount:a.amount,accountId:a.accountId,title:String(a.title||'').slice(0,160),category:String(a.category||'').slice(0,160)};
  function cashOut(amount=a.amount) {
    find(s.accounts,a.accountId);
    check(find(summary(s).accounts,a.accountId).balance>=amount,'На выбранном счёте недостаточно денег');
  }
  if(type==='setup') {
    check(currencies.includes(a.currency),'Выберите валюту');
    check(!s.settings.configured||a.currency===s.settings.currency||(!s.entries.length&&!s.sales.length&&s.accounts.every(x=>x.opening===0)),'Валюту нельзя менять после внесения сумм');
    s.settings={name:name(a.name),currency:a.currency,configured:true};
  } else if(type==='account') {
    s.accounts.push({id:a.id,name:name(a.name),opening:integer(a.opening,true)});
  } else if(type==='master') {
    check(Number.isInteger(a.rate)&&a.rate>=0&&a.rate<=100,'Процент должен быть целым числом от 0 до 100');
    const m={id:a.masterId||a.id,name:name(a.name),rate:a.rate,fixed:integer(a.fixed,true)};
    if(a.masterId) Object.assign(find(s.masters,a.masterId),m); else s.masters.push(m);
  } else {
    validDate(a.date);
    if(type!=='plan') check(a.date<=today(),'Будущие выплаты добавляйте в раздел «Платежи»');
    if(type==='sale') {
      const net=integer(a.amount)-integer(a.discount||0,true); integer(net);
      const m=a.masterId?find(s.masters,a.masterId):null;
      const commission=m?Math.round(net*m.rate/100)+m.fixed:0;
      check(commission<=net,'Начисление мастеру не может превышать стоимость услуги');
      s.sales.push({id:a.id,title:name(a.title),date:a.date,category:a.category||'Услуги',net,discount:a.discount||0,masterId:m?.id||'',commission,refunded:0});
    } else if(type==='plan') {
      s.plans.push({id:a.id,title:name(a.title),date:a.date,amount:integer(a.amount),category:a.category||'Прочие расходы',paid:false});
    } else {
      if(type==='settle') {
        const p=find(s.plans,a.planId); check(!p.paid,'Платёж уже исполнен'); cashOut(p.amount);
        Object.assign(entry,{type:'expense',amount:p.amount,title:p.title,category:p.category,planId:p.id}); p.paid=true;
      } else {
        integer(a.amount);
        if(type==='payment'||type==='refund') {
          const sale=find(s.sales,a.saleId); check(a.date>=sale.date,'Дата не может быть раньше услуги'); entry.saleId=sale.id; entry.title=sale.title; entry.category=sale.category;
          if(type==='payment') check(a.amount<=saleDue(s,sale.id),'Сумма превышает остаток к оплате');
          else {
            check(a.amount<=sale.net-sale.refunded,'Сумма превышает стоимость невозвращённых услуг');
            const available=s.entries.filter(e=>e.saleId===sale.id&&(a.creditId?e.creditId===a.creditId:!e.creditId)).reduce((n,e)=>n+(e.type==='payment'?e.amount:e.type==='refund'?-e.amount:0),0);
            check(a.amount<=available,'Возврат превышает оплату из выбранного источника');
            sale.refunded+=a.amount;
          }
          if(a.creditId) {
            const c=find(s.credits,a.creditId); check(a.date>=c.date,'Дата не может быть раньше предоплаты');
            if(type==='payment') check(creditBalance(s,c.id)>=a.amount,'Недостаточно средств предоплаты');
            entry.creditId=c.id; delete entry.accountId;
          } else { find(s.accounts,a.accountId); if(type==='refund') cashOut(); }
        } else if(type==='transfer') {
          cashOut(); find(s.accounts,a.toAccountId); check(a.accountId!==a.toAccountId,'Выберите разные счета'); entry.toAccountId=a.toAccountId;
        } else if(type==='payout') {
          find(s.masters,a.masterId); check(a.amount<=Math.min(masterTotals(s,a.masterId).due,masterTotals(s,a.masterId,a.date).due),'Выплата превышает долг мастеру на выбранную дату'); cashOut(); entry.masterId=a.masterId; entry.category='Выплаты мастерам'; entry.title=find(s.masters,a.masterId).name;
        } else if(type==='advance') {
          find(s.accounts,a.accountId); entry.title=name(a.title); s.credits.push({id:a.id,title:entry.title,amount:a.amount,date:a.date});
        } else if(['expense','withdrawal','investment'].includes(type)) cashOut();
        else if(['funding','income'].includes(type)) find(s.accounts,a.accountId);
        else throw new Error('Неизвестная операция');
      }
      s.entries.push(entry);
    }
  }
  s.seen.push(a.id); s.revision++;
  validateState(s);
  return s;
}
export function validateState(s) {
  check(s?.version===1 && Number.isSafeInteger(s.revision)&&s.revision>=0,'Неподдерживаемый формат резервной копии');
  check(s.settings&&currencies.includes(s.settings.currency)&&typeof s.settings.name==='string'&&s.settings.name.length<=160&&typeof s.settings.configured==='boolean','Повреждены настройки');
  for(const key of ['accounts','masters','sales','entries','plans','credits','seen']) check(Array.isArray(s[key])&&s[key].length<=50000,'Повреждён список '+key);
  for(const key of ['accounts','masters','sales','entries','plans','credits']) {
    const ids=new Set(); for(const x of s[key]) { check(x&&typeof x.id==='string'&&x.id.length<=160&&!ids.has(x.id),'Повреждены идентификаторы'); ids.add(x.id); }
  }
  check(s.seen.every(x=>typeof x==='string'&&x.length<=160)&&new Set(s.seen).size===s.seen.length,'Повреждён журнал команд');
  for(const a of s.accounts) { name(a.name); integer(a.opening,true); }
  for(const m of s.masters) { name(m.name); check(Number.isInteger(m.rate)&&m.rate>=0&&m.rate<=100,'Некорректный процент'); integer(m.fixed,true); }
  for(const x of s.sales) { name(x.title); validDate(x.date); integer(x.net); integer(x.discount,true); integer(x.commission,true); integer(x.refunded,true); check(x.refunded<=x.net&&x.commission<=x.net,'Повреждена услуга'); if(x.masterId) find(s.masters,x.masterId); }
  for(const p of s.plans) { name(p.title); validDate(p.date); integer(p.amount); check(typeof p.paid==='boolean','Повреждён платёж'); }
  for(const c of s.credits) { name(c.title); validDate(c.date); integer(c.amount); }
  for(const e of s.entries) {
    check(Object.hasOwn(labels,e.type),'Неизвестный тип операции'); validDate(e.date); integer(e.amount);
    for(const k of ['title','category']) check(typeof e[k]==='string'&&e[k].length<=160,'Повреждён текст операции');
    if(e.creditId) { check(['payment','refund'].includes(e.type),'Недопустимое использование предоплаты'); find(s.credits,e.creditId); } else find(s.accounts,e.accountId);
    if(['payment','refund'].includes(e.type)) find(s.sales,e.saleId);
    if(e.type==='transfer') { find(s.accounts,e.toAccountId); check(e.toAccountId!==e.accountId,'Перевод на тот же счёт'); }
    if(e.type==='payout') find(s.masters,e.masterId);
    if(e.planId) find(s.plans,e.planId);
  }
  for(const sale of s.sales) {
    check(saleDue(s,sale.id)>=0,'Услуга переплачена');
    check(s.entries.filter(e=>e.type==='refund'&&e.saleId===sale.id).reduce((n,e)=>n+e.amount,0)===sale.refunded,'Возвраты не совпадают');
    const sources=new Map();
    for(const e of s.entries.filter(e=>e.saleId===sale.id)) {
      check(e.date>=sale.date,'Оплата не может быть раньше услуги');
      const key=e.creditId||'cash';sources.set(key,(sources.get(key)||0)+(e.type==='payment'?e.amount:-e.amount));
    }
    check([...sources.values()].every(n=>n>=0),'Возврат превышает полученную оплату');
  }
  for(const c of s.credits) {
    check(creditBalance(s,c.id)>=0&&creditBalance(s,c.id)<=c.amount,'Неверный остаток предоплаты');
    const es=s.entries.filter(e=>e.type==='advance'&&e.id===c.id); check(es.length===1&&es[0].amount===c.amount,'Нет поступления предоплаты');
  }
  for(const p of s.plans) check(s.entries.filter(e=>e.planId===p.id).length===(p.paid?1:0),'Платёж исполнен некорректно');
  const t=summary(s);
  check(t.accounts.every(a=>Number.isSafeInteger(a.balance)&&a.balance>=0)&&Number.isSafeInteger(t.balance),'Некорректные остатки');
  return s;
}
