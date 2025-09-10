// app.js - updated UX + layout fixes

const DATA_URL = 'budgetwise-sample.json';

const defaultCategories = [
  { value: 'Food', key: 'food', color:'#FF6B6B' },
  { value: 'Transport', key: 'transport', color:'#4CC9F0' },
  { value: 'Shopping', key: 'shopping', color:'#6A4C93' },
  { value: 'Bills', key: 'bills', color:'#FFC107' },
  { value: 'Entertainment', key:'entertain', color:'#FF7AA2' },
  { value: 'Other', key:'other', color:'#94A3B8' }
];

let categories = loadCategories();
let expenses = loadExpenses();
let editingIndex = null;
let currentChartType = 'pie';
let activePage = 'usage';

/* storage utils */
function saveCategories(list){ localStorage.setItem('bw_categories', JSON.stringify(list)); }
function loadCategories(){
  try{
    const raw=localStorage.getItem('bw_categories');
    if(!raw){ localStorage.setItem('bw_categories', JSON.stringify(defaultCategories)); return defaultCategories.slice(); }
    return JSON.parse(raw);
  }catch(e){ localStorage.setItem('bw_categories', JSON.stringify(defaultCategories)); return defaultCategories.slice(); }
}
function saveExpenses(){ localStorage.setItem('bw_expenses', JSON.stringify(expenses)); }
function loadExpenses(){ try{ return JSON.parse(localStorage.getItem('bw_expenses') || '[]'); }catch(_){ return []; } }
function formatCurrency(n){ return (Number(n)||0).toLocaleString('en-US', {style:'currency', currency:'USD'}); }
function mapCategory(name){ return categories.find(c=>c.value===name) || categories[categories.length-1]; }

/* Pages structure */
const pages = {
  usage: usagePage,
  entry: entryPage,
  dashboard: dashboardPage,
  categories: categoriesPage,
  about: aboutPage
};

function usagePage(){
  return `
  <div class="card fade-in">
    <h3>How to use BudgetWise</h3>
    <ol style="padding-left:18px">
      <li>Add expenses from the <strong>Expenses</strong> page.</li>
      <li>Manage categories in <strong>Categories</strong>.</li>
      <li>View charts and summary in <strong>Dashboard</strong> and export a PDF report.</li>
      <li>Your data is saved locally (localStorage) — use Clear Data to reset.</li>
    </ol>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
      <button id="goToExpenses" class="btn btn-primary">Go to Expenses</button>
      <button id="goToDashboard" class="btn btn-ghost">Open Dashboard</button>
    </div>
  </div>
  `;
}

function entryPage(){
  // note: added inline button "Load sample data" (visible only if no data on attach)
  return `
  <div class="card form-card fade-in" style="min-height:320px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <h3 style="margin:0"><i class="fa-solid fa-plus" style="color:var(--primary);margin-right:8px"></i>Add / Edit Expense</h3>
      <div id="no-data-actions" style="display:none">
        <button id="loadSampleInline" class="btn btn-ghost">Load sample data</button>
      </div>
    </div>

    <form id="expenseForm" style="margin-top:12px">
      <div class="row">
        <div style="flex:0 0 170px;min-width:160px">
          <label for="date">Date</label>
          <input id="date" type="date" required />
        </div>

        <div style="flex:1;display:flex;align-items:end;gap:8px;min-width:240px">
          <div style="flex:1">
            <label for="categoryInput">Category</label>
            <div class="suggestions">
              <input id="categoryInput" type="search" autocomplete="off" placeholder="Type category" required />
              <div id="suggestionsList" class="suggestions-list" style="display:none"></div>
            </div>
          </div>
          <div style="flex:0 0 120px;display:flex;align-items:flex-end;gap:6px">
            <button type="button" id="manageCatsBtn" class="btn btn-ghost" title="Manage categories"><i class="fa-solid fa-tags"></i> Manage</button>
          </div>
        </div>
      </div>

      <div class="row">
        <div style="flex:1;min-width:220px">
          <label for="notes">Notes (optional)</label>
          <input id="notes" type="text" placeholder="Short note..." />
        </div>
        <div style="flex:0 0 160px;min-width:140px;display:flex;flex-direction:column;align-items:flex-end">
          <label for="amount">Amount (USD)</label>
          <input id="amount" type="number" step="0.01" min="0" placeholder="0.00" style="text-align:right" required />
        </div>
      </div>

      <div class="cta-row">
        <div class="muted small">Tip: type category to see suggestions. Press Enter to add.</div>
        <div style="display:flex;gap:8px">
          <button type="button" id="cancelEdit" class="btn btn-ghost" style="display:none">Cancel</button>
          <button class="btn btn-primary" type="submit" id="saveBtn"><i class="fa-solid fa-check" style="margin-right:8px"></i>Save</button>
        </div>
      </div>
      
    </form>
   <!-- why this not working? load data or clear data -->
    <div style="height:1px;background:var(--muted);margin:16px 0"></div>
    <div class="cta-row">
      <button id="loadSampleBtn" class="btn btn-ghost">Load sample data</button>
      <button id="clearDataBtn" class="btn btn-ghost">Clear local data</button>
    </div>
  </div>

  <div class="card right-sidebar" style="min-height:320px">
    <h3 style="margin:0;display:flex;align-items:center;gap:8px"><i class="fa-solid fa-list" style="color:var(--accent)"></i>Expenses</h3>
    <ul id="expense-list"></ul>
  </div>
  `;
}

function dashboardPage(){
  // use internal dashboard-grid to control spacing (avoids big empty area)
  return `
  <div class="dashboard-grid fade-in">
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="card">
        <div class="muted small">Total</div>
        <div id="dashboardTotal" style="font-size:24px;font-weight:700;margin-top:6px">${formatCurrency(computeTotal(expenses))}</div>
        <div class="muted small" style="margin-top:6px">Click Export to download report</div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div class="muted small">Quick Filters</div>
            <select id="chartPeriod" style="margin-top:8px">
              <option value="month" selected>This month</option>
              <option value="7">Last 7 days</option>
              <option value="year">This year</option>
              <option value="all">All time</option>
            </select>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn btn-ghost" id="toggleChartBtn" title="Toggle chart type"><i class="fa-solid fa-exchange-alt"></i></button>
            <button id="exportPdfDashboard" class="btn btn-primary"><i class="fa-solid fa-file-pdf" style="margin-right:8px"></i>Export PDF</button>
          </div>
        </div>
      </div>

      <div class="card">
        <h4 style="margin:0 0 8px 0">Insights</h4>
        <div id="insights" class="muted small">No insights yet.</div>
      </div>
    </div>

    <div class="card chart-card">
      <h3 style="margin:0 0 8px 0"><i class="fa-solid fa-chart-pie" style="color:var(--primary);margin-right:8px"></i>Expenses Analysis</h3>
      <div id="chartArea" class="chart-wrap" style="margin-top:10px"><canvas id="expenseChart"></canvas></div>
      <div class="chart-legend" id="chartLegend"></div>
    </div>
  </div>
  `;
}

function categoriesPage(){
  return `
  <div class="card fade-in">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <h3 style="margin:0">Manage Categories</h3>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input id="catSearch" placeholder="Search..." style="padding:8px;border-radius:8px;border:1px solid #e6e9ee;min-width:200px" />
        <button id="newCatBtn" class="btn btn-primary">New</button>
      </div>
    </div>

    <div id="categoriesGrid" style="margin-top:12px"></div>

    <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
      <button id="backFromCats" class="btn btn-ghost">Back</button>
    </div>
  </div>
  `;
}

function aboutPage(){
  return `
  <div class="card about fade-in">
    <h3>About BudgetWise</h3>
    <p class="muted">Responsive sample app. Add / edit categories. Data stored locally. Export a PDF report.</p>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
      <button id="downloadPdfBtn" class="btn btn-primary"><i class="fa-solid fa-file-pdf" style="margin-left:8px"></i>Export PDF</button>
      <button id="loadSampleBtn" class="btn btn-ghost">Load sample data</button>
      <button id="clearDataBtn" class="btn btn-ghost">Clear local data</button>
    </div>
  </div>
  `;
}

/* Render engine */
function renderPage(page){
  activePage = page;
  document.querySelectorAll('.nav-link').forEach(a=>a.classList.toggle('active', a.dataset.page===page));
  const main = document.getElementById('mainContent');
  main.innerHTML = pages[page]();

  if(page === 'entry') attachEntryLogic();
  if(page === 'dashboard') attachDashboardLogic();
  if(page === 'categories') attachCategoriesLogic();
  if(page === 'about') attachAboutLogic();
  if(page === 'usage') attachUsageLogic();
}

/* USAGE listeners */
function attachUsageLogic(){
  const goExpenses = document.getElementById('goToExpenses');
  if(goExpenses) goExpenses.addEventListener('click', ()=> renderPage('entry'));
  const goDash = document.getElementById('goToDashboard');
  if(goDash) goDash.addEventListener('click', ()=> renderPage('dashboard'));
}

/* ENTRY logic: NO automatic modal prompt. show inline Load-sample button when expenses empty */
function attachEntryLogic(){
  const categoryInput = document.getElementById('categoryInput');
  const suggestionsList = document.getElementById('suggestionsList');
  const dateInput = document.getElementById('date');
  dateInput.value = dateInput.value || new Date().toISOString().slice(0,10);

  // show inline "Load sample data" if there are no expenses
  const noDataActions = document.getElementById('no-data-actions');
  const loadBtnInline = document.getElementById('loadSampleInline');
  if(!expenses.length){ noDataActions.style.display='block'; } else { noDataActions.style.display='none'; }
  if(loadBtnInline) loadBtnInline.addEventListener('click', async ()=>{
    await loadSampleData(); saveExpenses(); renderPage('entry');
    Swal.fire({icon:'success',title:'Sample loaded',toast:true,position:'top-end',timer:1000,showConfirmButton:false});
  });

  function refreshExpenseList(){
    const listEl = document.getElementById('expense-list');
    const filtered = expenses.slice();
    listEl.innerHTML = '';
    filtered.slice().reverse().forEach((exp)=>{
      const idx = expenses.indexOf(exp);
      const cat = mapCategory(exp.category);
      const li = document.createElement('li');
      li.className = 'expense-item fade-in';
      li.innerHTML = `
        <div class="expense-left">
          <div class="badge" style="background:${cat.color}">${exp.category}</div>
          <div class="expense-meta">
            <div class="category">${exp.notes ? exp.notes : ''}</div>
            <div class="muted small">${exp.date}</div>
          </div>
        </div>
        <div class="expense-right">
          <div class="expense-amount">${formatCurrency(exp.amount)}</div>
          <div class="actions">
            <button class="edit-btn" data-idx="${idx}" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="del-btn" data-idx="${idx}" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `;
      listEl.appendChild(li);
    });
      // ---------- ensure bottom buttons in entry page work ----------
  const loadBottom = document.getElementById('loadSampleBtn');
  if (loadBottom) {
    loadBottom.addEventListener('click', async () => {
      try {
        await loadSampleData();   // loads sample and ensures categories exist
        saveExpenses();
        // re-render the current page so UI updates (expenses list, hide inline prompt...)
        renderPage('entry');
        Swal.fire({ icon: 'success', title: 'Sample loaded', toast: true, position: 'top-end', timer: 900, showConfirmButton: false });
      } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Load failed', text: 'Could not load sample data.' });
      }
    });
  }

  const clearBottom = document.getElementById('clearDataBtn');
  if (clearBottom) {
    clearBottom.addEventListener('click', () => {
      Swal.fire({
        title: 'Clear data?',
        text: 'This will remove saved categories and expenses from localStorage.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Clear'
      }).then(res => {
        if (res.isConfirmed) {
          localStorage.removeItem('bw_expenses');
          localStorage.removeItem('bw_categories');
          categories = loadCategories();
          expenses = [];
          saveExpenses();
          renderPage('usage'); // go to usage after clearing
          Swal.fire({ icon: 'success', title: 'Cleared', toast: true, position: 'top-end', timer: 900, showConfirmButton: false });
        }
      });
    });
  }
  // --------------------------------------------------------------

  }
  refreshExpenseList();

  function showSuggestions(q){
    const ql = q.trim().toLowerCase();
    if(!ql){ suggestionsList.style.display = 'none'; return; }
    const matches = categories.filter(c=>c.value.toLowerCase().includes(ql));
    if(matches.length===0){ suggestionsList.style.display='none'; return; }
    suggestionsList.innerHTML = matches.map(m=>`<div class="suggestion" data-val="${m.value}" data-color="${m.color}">${m.value}</div>`).join('');
    suggestionsList.style.display = 'block';
  }
  categoryInput.addEventListener('input', (e)=>{ showSuggestions(e.target.value); });
  categoryInput.addEventListener('focus', (e)=>{ showSuggestions(e.target.value); });
  document.addEventListener('click', (e)=>{ if(!e.target.closest('.suggestions')) suggestionsList.style.display='none'; });
  suggestionsList.addEventListener('click', (e)=>{ const s=e.target.closest('.suggestion'); if(!s) return; categoryInput.value = s.dataset.val; suggestionsList.style.display='none'; });

  const form = document.getElementById('expenseForm');
  form.addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const date = document.getElementById('date').value;
    const category = document.getElementById('categoryInput').value.trim();
    const notes = document.getElementById('notes').value;
    const amount = parseFloat(document.getElementById('amount').value);
    if(!date || !category || !amount || isNaN(amount) || amount<=0){
      Swal.fire({icon:'warning',title:'Error',text:'Please provide a valid date, category and amount.'}); return;
    }

    // ensure category exists
    if(!categories.find(c=>c.value.toLowerCase()===category.toLowerCase())){
      const key = category.toLowerCase().replace(/\s+/g,'-').slice(0,20);
      const color = '#94A3B8';
      categories.push({ value: category, key, color }); saveCategories(categories);
    }

    if(editingIndex !== null){
      expenses[editingIndex] = { date, category, notes, amount };
      editingIndex=null; document.getElementById('cancelEdit').style.display='none';
      document.getElementById('saveBtn').innerHTML = '<i class="fa-solid fa-check" style="margin-right:8px"></i>Save';
      Swal.fire({icon:'success',title:'Updated',toast:true,position:'top-end',timer:1100,showConfirmButton:false});
    }else{
      expenses.push({ date, category, notes, amount });
      Swal.fire({icon:'success',title:'Added',toast:true,position:'top-end',timer:1100,showConfirmButton:false});
    }

    saveExpenses();
    form.reset(); dateInput.value = new Date().toISOString().slice(0,10);
    refreshExpenseList();
    if(activePage==='dashboard') updateChartAndLegend();
    // hide inline sample button if now data exists
    if(noDataActions) noDataActions.style.display = expenses.length ? 'none' : 'block';
  });

  // edit/delete delegation
  document.getElementById('expense-list').addEventListener('click',(e)=>{
    const editBtn = e.target.closest('.edit-btn'); const delBtn = e.target.closest('.del-btn');
    if(editBtn){ const idx=parseInt(editBtn.dataset.idx); startEdit(idx); }
    if(delBtn){ const idx=parseInt(delBtn.dataset.idx);
      Swal.fire({title:'Delete?',text:'This will permanently remove the expense.',icon:'warning',showCancelButton:true,confirmButtonText:'Delete'})
        .then(res=>{ if(res.isConfirmed){ expenses.splice(idx,1); saveExpenses(); refreshExpenseList(); if(activePage==='dashboard') updateChartAndLegend(); Swal.fire({icon:'success',title:'Deleted',toast:true,position:'top-end',timer:1000,showConfirmButton:false}); } });
    }
  });

  function startEdit(idx){
    const e = expenses[idx]; if(!e) return;
    editingIndex = idx;
    document.getElementById('date').value = e.date;
    document.getElementById('categoryInput').value = e.category;
    document.getElementById('notes').value = e.notes || '';
    document.getElementById('amount').value = e.amount;
    document.getElementById('cancelEdit').style.display='inline-block';
    document.getElementById('saveBtn').innerHTML = '<i class="fa-solid fa-pen" style="margin-right:8px"></i>Save';
    window.scrollTo({top:0,behavior:'smooth'});
  }

  document.getElementById('cancelEdit').addEventListener('click', ()=>{
    editingIndex=null; form.reset(); dateInput.value = new Date().toISOString().slice(0,10);
    document.getElementById('cancelEdit').style.display='none';
    document.getElementById('saveBtn').innerHTML = '<i class="fa-solid fa-check" style="margin-right:8px"></i>Save';
  });

  document.getElementById('manageCatsBtn').addEventListener('click', ()=>{ renderPage('categories'); });
}

/* DASHBOARD logic */
function attachDashboardLogic(){
  const cp = document.getElementById('chartPeriod'); if(cp) cp.addEventListener('change', updateChartAndLegend);
  const tb = document.getElementById('toggleChartBtn'); if(tb) tb.addEventListener('click', ()=>{ currentChartType = currentChartType==='pie'?'bar':'pie'; updateChartAndLegend(); });
  const pdfBtn = document.getElementById('exportPdfDashboard'); if(pdfBtn) pdfBtn.addEventListener('click', generateReportPDF);
  updateChartAndLegend();
  window.addEventListener('resize', ()=>{ if(window.expenseChartInstance) window.expenseChartInstance.resize(); });
}

function updateChartAndLegend(){
  const canvas = document.getElementById('expenseChart'); const chartArea = document.getElementById('chartArea');
  const period = (document.getElementById('chartPeriod') && document.getElementById('chartPeriod').value) || 'month';
  const filtered = filterByPeriod(period);
  const totals = {}; filtered.forEach(e=>{ totals[e.category] = (totals[e.category] || 0) + Number(e.amount); });
  const labels = Object.keys(totals).length ? Object.keys(totals) : [];
  const data = Object.keys(totals).length ? Object.values(totals) : [];

  if((!labels.length) || data.reduce((a,b)=>a+b,0)===0){
    if(window.expenseChartInstance){ window.expenseChartInstance.destroy(); window.expenseChartInstance = null; }
    chartArea.innerHTML = `<div class="no-data" style="text-align:center;padding:30px">
      <div style="font-size:34px;margin-bottom:8px;color:var(--muted)"><i class="fa-regular fa-face-meh"></i></div>
      <div style="font-weight:700;margin-bottom:6px">No data to show</div>
      <div class="muted small" style="margin-bottom:12px">Add some expenses to see analysis.</div>
      <button id="goAddBtn" class="btn btn-primary"><i class="fa-solid fa-plus" style="margin-right:8px"></i>Add</button></div>`;
    document.getElementById('chartLegend').innerHTML='';
    const goBtn=document.getElementById('goAddBtn'); if(goBtn) goBtn.addEventListener('click', ()=>{ renderPage('entry'); window.scrollTo({top:0,behavior:'smooth'}) });
    const insights=document.getElementById('insights'); if(insights) insights.innerHTML='<div class="muted small">No expenses in this period.</div>';
    const dashTot=document.getElementById('dashboardTotal'); if(dashTot) dashTot.textContent = formatCurrency(computeTotal(expenses));
    return;
  }

  const bgColors = labels.map(l => { const c = categories.find(x=>x.value===l); return c ? c.color : '#94A3B8'; });
  if(window.expenseChartInstance) window.expenseChartInstance.destroy();
  window.expenseChartInstance = new Chart(canvas.getContext('2d'), {
    type: currentChartType,
    data: { labels, datasets:[{data, backgroundColor:bgColors, borderWidth: currentChartType==='pie'?2:0, borderColor:'#fff'}] },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false},
        tooltip:{callbacks:{
          label:function(ctx){
            const val=ctx.raw||0; const total=data.reduce((a,b)=>a+b,0)||1; const pct=((val/total)*100).toFixed(1);
            return `${ctx.label}: $${Number(val).toFixed(2)} (${pct}%)`;
          }}}},
      scales: currentChartType==='bar'?{ x:{ticks:{font:{size:14}}}, y:{beginAtZero:true,ticks:{font:{size:14}}} } : {}
    }
  });

  const legendWrap = document.getElementById('chartLegend'); legendWrap.innerHTML='';
  labels.forEach((l,i)=>{
    const color=bgColors[i];
    const div=document.createElement('div');
    div.className='legend-item'; div.innerHTML = `<div class="legend-color" style="background:${color}"></div><div>${l} — <span class="muted small">${formatCurrency(data[i])}</span></div>`;
    legendWrap.appendChild(div);
  });

  const insights = document.getElementById('insights'); if(insights){
    const total=data.reduce((a,b)=>a+b,0); let max=-1,maxi=0; data.forEach((v,i)=>{ if(v>max){ max=v; maxi=i }});
    const top = labels[maxi]; const pct = ((max/total)*100).toFixed(1);
    insights.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <div><div style="font-weight:700">${top}</div><div class="muted small">Top category — ${pct}% of period</div></div>
      <div style="font-weight:700">${formatCurrency(max)}</div></div>`;
  }

  const dashTot = document.getElementById('dashboardTotal'); if(dashTot) dashTot.textContent = formatCurrency(computeTotal(expenses));
}

/* Categories logic (unchanged structure) */
function attachCategoriesLogic(){
  const grid = document.getElementById('categoriesGrid'); const search = document.getElementById('catSearch');
  const newBtn = document.getElementById('newCatBtn'); const back = document.getElementById('backFromCats');
  function renderGrid(q){
    grid.innerHTML = '';
    const list = q ? categories.filter(c=>c.value.toLowerCase().includes(q.toLowerCase())) : categories.slice();
    list.forEach((c,idx)=>{
      const d=document.createElement('div');
      d.className='cat-card';
      d.innerHTML = `<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <div class="badge" style="background:${c.color}">${c.value}</div>
          <div class="muted small">${c.key}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost edit-cat" data-idx="${idx}"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-ghost del-cat" data-idx="${idx}"><i class="fa-solid fa-trash"></i></button>
        </div>`;
      grid.appendChild(d);
    });
  }
  renderGrid();
  search.addEventListener('input',(e)=>{ renderGrid(e.target.value); });

  newBtn.addEventListener('click', ()=>{
    Swal.fire({
      title:'Add category',
      html:`<input id="swal-cat-name" class="swal2-input" placeholder="Name">
            <input id="swal-cat-color" type="color" class="swal2-input" value="#94A3B8">`,
      confirmButtonText:'Add',
      preConfirm:()=>{
        const name=document.getElementById('swal-cat-name').value.trim();
        const color=document.getElementById('swal-cat-color').value;
        if(!name){ Swal.showValidationMessage('Name is required'); return false;}
        return {name,color};
      }
    }).then(res=>{
      if(res.isConfirmed && res.value){
        const {name,color} = res.value;
        const key=name.toLowerCase().replace(/\s+/g,'-').slice(0,20);
        categories.push({value:name,key,color}); saveCategories(categories);
        renderGrid(); if(document.getElementById('categoryInput')) document.getElementById('categoryInput').value = name;
        Swal.fire({icon:'success',title:'Added',toast:true,position:'top-end',timer:1000,showConfirmButton:false});
      }
    });
  });

  grid.addEventListener('click',(e)=>{
    const del = e.target.closest('.del-cat'); const edit = e.target.closest('.edit-cat');
    if(del){
      const idx=parseInt(del.dataset.idx);
      if(categories.length<=1){ Swal.fire({icon:'warning',text:'Cannot delete last category.'}); return; }
      Swal.fire({title:'Delete category?',text:'Existing expenses keep the same label.',icon:'warning',showCancelButton:true,confirmButtonText:'Delete'})
        .then(res=>{ if(res.isConfirmed){ categories.splice(idx,1); saveCategories(categories); renderGrid(); if(document.getElementById('categoryInput')) document.getElementById('categoryInput').value=''; } });
    }
    if(edit){
      const idx=parseInt(edit.dataset.idx); const c=categories[idx];
      Swal.fire({
        title:'Edit category',
        html:`<input id="swal-cat-name" class="swal2-input" value="${c.value}">
              <input id="swal-cat-color" type="color" class="swal2-input" value="${c.color}">`,
        confirmButtonText:'Save',
        preConfirm:()=>{
          const name=document.getElementById('swal-cat-name').value.trim();
          const color=document.getElementById('swal-cat-color').value;
          if(!name){ Swal.showValidationMessage('Name is required'); return false;}
          return {name,color};
        }
      }).then(res=>{
        if(res.isConfirmed && res.value){
          categories[idx].value=res.value.name;
          categories[idx].color=res.value.color;
          saveCategories(categories);
          renderGrid(); if(document.getElementById('categoryInput')) document.getElementById('categoryInput').value = categories[idx].value;
          Swal.fire({icon:'success',title:'Saved',toast:true,position:'top-end',timer:900,showConfirmButton:false});
        }
      });
    }
  });

  back.addEventListener('click', ()=>{ renderPage('entry'); });
}

/* About logic (Export + load sample + clear) */
function attachAboutLogic(){
  document.getElementById('downloadPdfBtn').addEventListener('click', generateReportPDF);
  document.getElementById('loadSampleBtn').addEventListener('click', async ()=>{
    await loadSampleData(); saveExpenses(); renderPage(activePage);
    Swal.fire({icon:'success',title:'Sample loaded',toast:true,position:'top-end',timer:1100,showConfirmButton:false});
  });
  document.getElementById('clearDataBtn').addEventListener('click', ()=>{
    Swal.fire({title:'Clear data?',text:'This will remove saved categories and expenses',icon:'warning',showCancelButton:true,confirmButtonText:'Clear'})
    .then(res=>{ if(res.isConfirmed){ localStorage.removeItem('bw_expenses'); localStorage.removeItem('bw_categories'); categories = loadCategories(); expenses = []; Swal.fire({icon:'success',title:'Cleared',toast:true,position:'top-end',timer:900,showConfirmButton:false}); renderPage('usage'); }});
  });
}

/* Filters/helpers */
function filterByPeriod(period, list = expenses){
  if(!period || period === 'all') return list.slice();
  const now = new Date();
  return list.filter(e=>{
    const d=new Date(e.date);
    if(period==='7'){const diff=(now-d)/(1000*60*60*24); return diff<=7;}
    if(period==='month'){return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();}
    if(period==='year'){return d.getFullYear()===now.getFullYear();}
    return true;
  });
}
function computeTotal(list){ return list.reduce((s,it)=>s + (parseFloat(it.amount) || 0), 0); }

/* PDF generation (same robust approach as before) */
async function generateReportPDF(){
  // Robust PDF export: builds a temporary report DOM, captures it with html2canvas,
  // then saves it as a multi-page PDF using jsPDF. Uses the existing chart canvas
  // (expenseChart) when available to include a clear chart image.
  const { jsPDF } = window.jspdf;

  // Create temp report container (off-screen)
  const reportContainer = document.createElement('div');
  reportContainer.id = 'bw-report-temp';
  reportContainer.style.width = '900px';
  reportContainer.style.padding = '24px';
  reportContainer.style.fontFamily = 'Poppins, Arial, sans-serif';
  reportContainer.style.background = '#fff';
  reportContainer.style.color = '#111';
  reportContainer.style.position = 'fixed';
  reportContainer.style.left = '-9999px';
  reportContainer.style.top = '0';
  reportContainer.style.zIndex = '9999';

  try{
    // Header
    const header = document.createElement('div');
    header.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div>
          <h2 style="margin:0;color:#0c7a4a">BudgetWise — Expense Report</h2>
          <div style="color:#666;margin-top:6px">Generated: ${new Date().toLocaleString()}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700;font-size:20px">${formatCurrency(computeTotal(expenses))}</div>
          <div style="color:#666">Total expenses</div>
        </div>
      </div>
      <hr style="margin:14px 0;border:none;border-top:1px solid #eee" />
    `;
    reportContainer.appendChild(header);

    // Summary boxes
    const totalMonth = computeTotal(filterByPeriod('month'));
    const totalWeek = computeTotal(filterByPeriod('7'));
    const totalYear = computeTotal(filterByPeriod('year'));

    const summary = document.createElement('div');
    summary.style.display = 'flex';
    summary.style.gap = '12px';
    summary.style.flexWrap = 'wrap';
    const makeBox = (title, val, hint, bg) => {
      const div = document.createElement('div');
      div.style.flex = '1';
      div.style.minWidth = '220px';
      div.style.padding = '12px';
      div.style.borderRadius = '10px';
      div.style.background = bg;
      div.style.color = '#fff';
      div.innerHTML = `<div style="font-size:13px">${title}</div>
                       <div style="font-weight:700;font-size:18px;margin-top:6px">${formatCurrency(val)}</div>
                       <div style="opacity:.9;font-size:12px;margin-top:6px">${hint}</div>`;
      return div;
    };
    summary.appendChild(makeBox('This month', totalMonth, 'Sum for this month', 'linear-gradient(135deg,#0c7a4a,#36b37e)'));
    summary.appendChild(makeBox('Last 7 days', totalWeek, 'Sum for last 7 days', 'linear-gradient(135deg,#ff7aa2,#ff6b6b)'));
    summary.appendChild(makeBox('This year', totalYear, 'Sum for this year', 'linear-gradient(135deg,#ffb04c,#ffda79)'));
    reportContainer.appendChild(summary);

    // Chart capture: prefer existing chart canvas, else build a temporary pie via Chart.js
    let chartImgData = null;
    try {
      if (document.getElementById('expenseChart')) {
        const canvas = document.getElementById('expenseChart');
        // If chart exists and has content, export its image
        try {
          chartImgData = canvas.toDataURL('image/png', 1.0);
        } catch (err) {
          console.warn('expenseChart toDataURL failed', err);
          chartImgData = null;
        }
      }

      if (!chartImgData) {
        // Build small offscreen canvas and render a pie (fallback)
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = 900;
        tmpCanvas.height = 420;
        const ctx = tmpCanvas.getContext('2d');
        const totals = {};
        expenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + Number(e.amount); });
        const labels = Object.keys(totals);
        const data = Object.values(totals);
        const bgColors = labels.map(l => {
          const c = categories.find(x => x.value === l);
          return c ? c.color : '#94A3B8';
        });
        if (labels.length) {
          // eslint-disable-next-line no-undef
          const tmpChart = new Chart(ctx, {
            type: 'pie',
            data: { labels, datasets: [{ data, backgroundColor: bgColors }] },
            options: { responsive: false, maintainAspectRatio: false, plugins: { legend: { display: false } } }
          });
          // wait a moment to let chart draw
          await new Promise(r => setTimeout(r, 120));
          chartImgData = tmpCanvas.toDataURL('image/png', 1.0);
          tmpChart.destroy();
        }
      }
    } catch(chartErr){
      console.warn('chart capture fallback failed', chartErr);
      chartImgData = null;
    }

    if (chartImgData) {
      const imgWrap = document.createElement('div');
      imgWrap.style.margin = '18px 0';
      imgWrap.innerHTML = `<div style="font-weight:700;margin-bottom:8px">Expenses distribution</div>`;
      const img = document.createElement('img');
      img.src = chartImgData;
      img.style.width = '100%';
      img.style.borderRadius = '8px';
      imgWrap.appendChild(img);
      reportContainer.appendChild(imgWrap);
    }

    // Table of top categories
    const totalsObj = {};
    expenses.forEach(e => { totalsObj[e.category] = (totalsObj[e.category] || 0) + Number(e.amount); });
    const rows = Object.keys(totalsObj).map(cat => ({ cat, val: totalsObj[cat] })).sort((a,b) => b.val - a.val);

    const tableWrap = document.createElement('div');
    tableWrap.style.marginTop = '12px';
    tableWrap.innerHTML = `<div style="font-weight:700;margin-bottom:8px">Category details</div>`;
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.innerHTML = `<thead><tr>
      <th style="text-align:right;padding:8px;border-bottom:1px solid #eee">Category</th>
      <th style="text-align:right;padding:8px;border-bottom:1px solid #eee">Total</th>
    </tr></thead>`;
    const tbody = document.createElement('tbody');
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td style="padding:8px;border-bottom:1px dashed #f0f0f0;text-align:right">${r.cat}</td>
                      <td style="padding:8px;border-bottom:1px dashed #f0f0f0;text-align:right;font-weight:700">${formatCurrency(r.val)}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    reportContainer.appendChild(tableWrap);

    // Footer summary
    const footer = document.createElement('div');
    footer.style.marginTop = '18px';
    footer.style.opacity = '.85';
    footer.innerHTML = `<hr style="margin:12px 0;border:none;border-top:1px solid #eee" />
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap">
        <div style="color:#666">Generated by BudgetWise — ${new Date().toLocaleDateString()}</div>
        <div style="font-weight:700">Number of expenses: ${expenses.length}</div>
      </div>`;
    reportContainer.appendChild(footer);

    // Append to DOM (off-screen) to allow html2canvas to render fonts/styles
    document.body.appendChild(reportContainer);

    // Use html2canvas to capture
    const canvas = await html2canvas(reportContainer, { scale: 1.4, useCORS: true, backgroundColor: '#ffffff' });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const imgWidth = pageWidth - margin * 2;
    const ratio = canvas.width / canvas.height;
    const imgHeight = imgWidth / ratio;

    // If content fits a single page, just add and save
    if (imgHeight <= pageHeight - margin * 2) {
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
      pdf.save(`BudgetWise-Report-${new Date().toISOString().slice(0,10)}.pdf`);
    } else {
      // Split long canvas into multiple pages
      // We'll slice the canvas vertically into page-sized chunks
      const canvasPageHeight = Math.floor((pageHeight - margin * 2) * (canvas.width / imgWidth));
      let srcY = 0;
      let page = 0;
      while (srcY < canvas.height) {
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.min(canvasPageHeight, canvas.height - srcY);
        const pctx = pageCanvas.getContext('2d');
        pctx.drawImage(canvas, 0, srcY, pageCanvas.width, pageCanvas.height, 0, 0, pageCanvas.width, pageCanvas.height);
        const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
        if (page === 0) {
          pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, pageCanvas.height / (canvas.width / imgWidth), undefined, 'FAST');
        } else {
          pdf.addPage();
          pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, pageCanvas.height / (canvas.width / imgWidth), undefined, 'FAST');
        }
        srcY += pageCanvas.height;
        page++;
      }
      pdf.save(`BudgetWise-Report-${new Date().toISOString().slice(0,10)}.pdf`);
    }

    // success toast
    Swal.fire({ icon: 'success', title: 'Report exported', toast: true, position: 'top-end', timer: 1100, showConfirmButton: false });
  }catch(err){
    console.error('generateReportPDF error', err);
    Swal.fire({ icon: 'error', title: 'Export failed', text: 'There was an error while creating the PDF.' });
  } finally {
    // cleanup: remove temp node if exists
    const temp = document.getElementById('bw-report-temp');
    if (temp) temp.remove();
  }
}


/* Sample loader ensures categories exist */
async function loadSampleData(){
  try{
    const res = await fetch(DATA_URL, { cache:'no-store' });
    if(res.ok){
      const json = await res.json();
      if(Array.isArray(json) && json.length){
        json.forEach(item=>{
          if(!categories.find(c=>c.value.toLowerCase()===String(item.category || '').toLowerCase())){
            const key = String(item.category || 'Other').toLowerCase().replace(/\s+/g,'-').slice(0,20);
            const color = '#94A3B8';
            categories.push({ value: String(item.category || 'Other'), key, color });
          }
        });
        saveCategories(categories);
        expenses = json;
        saveExpenses();
        return;
      }
    }
  }catch(err){ console.warn('fetch sample failed', err); }
  // fallback
  const sample = [];
  const today = new Date();
  for(let i=0;i<8;i++){
    const d = new Date(today.getTime() - (i*24*60*60*1000));
    const cat = defaultCategories[i % defaultCategories.length].value;
    sample.push({
      date: d.toISOString().slice(0,10),
      category: cat,
      notes: `Sample ${i+1}`,
      amount: (Math.random()*90 + 5).toFixed(2)
    });
  }
  sample.forEach(item=>{
    if(!categories.find(c=>c.value===item.category)){
      categories.push({ value: item.category, key: item.category.toLowerCase().replace(/\s+/g,'-'), color:'#94A3B8' });
    }
  });
  saveCategories(categories);
  expenses = sample;
  saveExpenses();
}

/* INIT + nav behavior (mobile overlay + click outside) */
function init(){
  // NOTE: No automatic fetch/load of sample data here.
  // Sample data will only load when the user explicitly clicks a "Load sample" button
  // (e.g. the inline button in Expenses page or "Load sample data" in About).

  // Render initial page (Usage)
  renderPage('usage');

  // nav links
  document.querySelectorAll('.nav-link').forEach(a=>{
    a.addEventListener('click',(e)=>{ 
      e.preventDefault(); 
      renderPage(a.dataset.page); 
      setTimeout(()=>{ window.scrollTo({top:0,behavior:'smooth'}) },60); 
      hideMobileNav();
    });
  });

  // hamburger + overlay behavior
  const hamb = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  const overlay = document.getElementById('navOverlay');
  function showMobileNav(){ navLinks.classList.add('show'); overlay.classList.add('show'); }
  function hideMobileNav(){ navLinks.classList.remove('show'); overlay.classList.remove('show'); }
  hamb.addEventListener('click', (e)=>{ // toggle
    const is = navLinks.classList.contains('show');
    if(is) hideMobileNav(); else showMobileNav();
  });
  overlay.addEventListener('click', hideMobileNav);
  // Escape closes the mobile nav as well
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') hideMobileNav(); });

  // theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if(themeToggle){
    themeToggle.addEventListener('click', ()=>{
      document.body.classList.toggle('dark');
      themeToggle.innerHTML = document.body.classList.contains('dark')?'<i class="fa-solid fa-sun"></i>':'<i class="fa-solid fa-moon"></i>';
    });
  }

  // FAB -> go to Expenses
  const fab = document.getElementById('fabAdd');
  if(fab) fab.addEventListener('click', ()=>{ renderPage('entry'); window.scrollTo({top:0,behavior:'smooth'}) });

  // remove splash
  const s=document.getElementById('splash'); if(s){ s.classList.add('hide'); setTimeout(()=>s.remove(),350); }

  // expose debug helpers
  window.bw = { expenses, saveExpenses, renderPage, categories, saveCategories, loadSampleData, hideMobileNav };

  // close mobile nav if resizing large screen
  window.addEventListener('resize', ()=>{ if(window.innerWidth>880) hideMobileNav(); });
}
// -----------------------------------------------------------------------


init();
