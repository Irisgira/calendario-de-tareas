(function(){
  const STORAGE_KEY = 'kawaiiTasksU';
  const PLAT_LABEL = { aula:'Aula Virtual', teams:'Teams', examen:'Examen presencial', exposicion:'Exposición' };

  let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  let calDate = new Date();
  let selectedDay = null;

  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

  function daysUntil(fecha){
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(fecha+'T00:00:00');
    return Math.round((d - today) / 86400000);
  }
  function dueLabel(fecha){
    const n = daysUntil(fecha);
    if(n < 0) return 'Venció';
    if(n === 0) return 'Hoy';
    if(n === 1) return 'Mañana';
    return `En ${n} días`;
  }

  /* ---------- render tareas ---------- */
  function renderTasks(){
    const pend = tasks.filter(t=>!t.completada).sort((a,b)=> a.fecha.localeCompare(b.fecha));
    const done = tasks.filter(t=>t.completada).sort((a,b)=> b.fecha.localeCompare(a.fecha));

    document.getElementById('count-pend').textContent = pend.length;
    document.getElementById('count-done').textContent = done.length;

    const pendEl = document.getElementById('list-pendientes');
    const doneEl = document.getElementById('list-completadas');

    pendEl.innerHTML = pend.length ? pend.map(cardHTML).join('') :
      '<div class="empty">✨ No tienes tareas pendientes. ¡A descansar!</div>';
    doneEl.innerHTML = done.length ? done.map(cardHTML).join('') :
      '<div class="empty">Aún no marcas tareas como completadas.</div>';

    document.querySelectorAll('[data-check]').forEach(b=> b.onclick = ()=> toggleDone(b.dataset.check));
    document.querySelectorAll('[data-edit]').forEach(b=> b.onclick = ()=> openEdit(b.dataset.edit));
    document.querySelectorAll('[data-del]').forEach(b=> b.onclick = ()=> removeTask(b.dataset.del));
  }

  function cardHTML(t){
    const n = daysUntil(t.fecha);
    const urgent = !t.completada && n <= 1;
    return `
    <div class="task-card ${t.completada?'done':''}">
      <button class="check-btn ${t.completada?'checked':''}" data-check="${t.id}">${t.completada?'✓':''}</button>
      <div class="task-body">
        <p class="task-title">${escapeHTML(t.titulo)}</p>
        <div class="task-meta">
          <span class="badge ${t.plataforma}">${PLAT_LABEL[t.plataforma]}</span>
          <span class="due ${urgent?'urgent':''}">${dueLabel(t.fecha)} · ${formatDate(t.fecha)}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-btn" data-edit="${t.id}">✏️</button>
        <button class="icon-btn" data-del="${t.id}">🗑️</button>
      </div>
    </div>`;
  }

  function escapeHTML(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
  function formatDate(f){
    const d = new Date(f+'T00:00:00');
    return d.toLocaleDateString('es-CO', { day:'numeric', month:'short' });
  }

  function toggleDone(id){
    const t = tasks.find(x=>x.id===id);
    if(!t) return;
    t.completada = !t.completada;
    save(); renderTasks(); renderCalendar();
    if(t.completada) confetti();
  }
  function removeTask(id){
    if(!confirm('¿Eliminar esta tarea?')) return;
    tasks = tasks.filter(x=>x.id!==id);
    save(); renderTasks(); renderCalendar();
  }

  /* ---------- modal ---------- */
  const overlay = document.getElementById('overlay');
  const form = document.getElementById('task-form');
  document.getElementById('fab-add').onclick = ()=> openNew();
  document.getElementById('btn-cancel').onclick = closeModal;
  overlay.onclick = (e)=>{ if(e.target===overlay) closeModal(); };

  function openNew(){
    document.getElementById('modal-title').textContent = 'Nueva tarea';
    form.reset();
    document.getElementById('task-id').value = '';
    overlay.classList.add('active');
  }
  function openEdit(id){
    const t = tasks.find(x=>x.id===id);
    if(!t) return;
    document.getElementById('modal-title').textContent = 'Editar tarea';
    document.getElementById('task-id').value = t.id;
    document.getElementById('f-titulo').value = t.titulo;
    document.getElementById('f-plataforma').value = t.plataforma;
    document.getElementById('f-fecha').value = t.fecha;
    document.getElementById('f-notas').value = t.notas || '';
    overlay.classList.add('active');
  }
  function closeModal(){ overlay.classList.remove('active'); }

  form.onsubmit = (e)=>{
    e.preventDefault();
    const id = document.getElementById('task-id').value;
    const data = {
      titulo: document.getElementById('f-titulo').value.trim(),
      plataforma: document.getElementById('f-plataforma').value,
      fecha: document.getElementById('f-fecha').value,
      notas: document.getElementById('f-notas').value.trim(),
    };
    if(!data.titulo || !data.fecha) return;
    if(id){
      const t = tasks.find(x=>x.id===id);
      Object.assign(t, data);
    } else {
      tasks.push({ id: uid(), completada:false, ...data });
    }
    save(); closeModal(); renderTasks(); renderCalendar();
  };

  /* ---------- tabs ---------- */
  document.querySelectorAll('.tab').forEach(tab=>{
    tab.onclick = ()=>{
      document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('view-'+tab.dataset.view).classList.add('active');
      if(tab.dataset.view==='calendario') renderCalendar();
    };
  });

  /* ---------- calendario ---------- */
  const DOWS = ['D','L','M','M','J','V','S'];
  function renderCalendar(){
    const dowEl = document.getElementById('cal-dow');
    if(!dowEl.childElementCount){
      dowEl.innerHTML = DOWS.map(d=>`<div class="cal-dow">${d}</div>`).join('');
    }
    const y = calDate.getFullYear(), m = calDate.getMonth();
    document.getElementById('cal-label').textContent =
      calDate.toLocaleDateString('es-CO', { month:'long', year:'numeric' });

    const first = new Date(y,m,1);
    const startPad = first.getDay();
    const daysInMonth = new Date(y,m+1,0).getDate();
    const todayStr = new Date().toISOString().slice(0,10);

    let html = '';
    for(let i=0;i<startPad;i++) html += '<div class="cal-day pad"></div>';
    for(let d=1; d<=daysInMonth; d++){
      const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayTasks = tasks.filter(t=>t.fecha===dateStr);
      const pendCount = dayTasks.filter(t=>!t.completada).length;
      let cls = 'cal-day';
      if(dateStr===todayStr) cls += ' today';
      if(pendCount>0) cls += ' deadline';
      else if(dayTasks.length>0) cls += ' deadline done-only';
      html += `<div class="${cls}" data-date="${dateStr}">${d}${dayTasks.length?'<span class="dot"></span>':''}</div>`;
    }
    document.getElementById('cal-grid').innerHTML = html;

    document.querySelectorAll('.cal-day[data-date]').forEach(cell=>{
      cell.onclick = ()=>{ selectedDay = cell.dataset.date; renderSelectedDay(); };
    });
    if(selectedDay) renderSelectedDay();
  }

  function renderSelectedDay(){
    const box = document.getElementById('cal-selected');
    const dayTasks = tasks.filter(t=>t.fecha===selectedDay);
    if(!dayTasks.length){ box.innerHTML=''; return; }
    box.innerHTML = `<h3>Tareas para ${formatDate(selectedDay)}</h3>` + dayTasks.map(cardHTML).join('');
    document.querySelectorAll('[data-check]').forEach(b=> b.onclick = ()=> toggleDone(b.dataset.check));
    document.querySelectorAll('[data-edit]').forEach(b=> b.onclick = ()=> openEdit(b.dataset.edit));
    document.querySelectorAll('[data-del]').forEach(b=> b.onclick = ()=> removeTask(b.dataset.del));
  }

  document.getElementById('cal-prev').onclick = ()=>{ calDate.setMonth(calDate.getMonth()-1); renderCalendar(); };
  document.getElementById('cal-next').onclick = ()=>{ calDate.setMonth(calDate.getMonth()+1); renderCalendar(); };

  /* ---------- confetti al completar ---------- */
  function confetti(){
    const emojis = ['🎉','✨','💗','🌸'];
    for(let i=0;i<14;i++){
      const s = document.createElement('span');
      s.textContent = emojis[Math.floor(Math.random()*emojis.length)];
      s.style.position = 'fixed';
      s.style.left = (45 + Math.random()*10) + 'vw';
      s.style.top = '40vh';
      s.style.fontSize = (14 + Math.random()*10) + 'px';
      s.style.zIndex = 20;
      s.style.pointerEvents = 'none';
      s.style.transition = 'transform 1s ease-out, opacity 1s ease-out';
      document.body.appendChild(s);
      const angle = Math.random()*Math.PI*2, dist = 80+Math.random()*120;
      requestAnimationFrame(()=>{
        s.style.transform = `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist - 60}px) rotate(${Math.random()*360}deg)`;
        s.style.opacity = '0';
      });
      setTimeout(()=> s.remove(), 1000);
    }
  }

  /* ---------- floaters de fondo ---------- */
  (function initFloaters(){
    const box = document.getElementById('floaters');
    const items = ['🌸','⭐','💗','🎀','✨'];
    for(let i=0;i<9;i++){
      const s = document.createElement('span');
      s.textContent = items[i % items.length];
      s.style.left = (Math.random()*95)+'vw';
      s.style.top = (Math.random()*95)+'vh';
      s.style.animationDelay = (Math.random()*6)+'s';
      s.style.animationDuration = (7+Math.random()*5)+'s';
      box.appendChild(s);
    }
  })();

  renderTasks();
  renderCalendar();
})();
