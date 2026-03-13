import { db, templatesTable } from "@workspace/db";

const templates = [
  {
    name: "Landing Page",
    description: "A clean marketing landing page with hero, features, and CTA sections",
    category: "Marketing",
    emoji: "🚀",
    files: [{ filename: "index.html", language: "html", content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>My Product</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;color:#1a1a2e}
nav{display:flex;justify-content:space-between;align-items:center;padding:1.2rem 5%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.08);position:sticky;top:0;z-index:10}
.logo{font-size:1.4rem;font-weight:700;color:#6c63ff}.nav-links a{margin-left:1.5rem;text-decoration:none;color:#555;font-size:.95rem}
.btn{background:#6c63ff;color:#fff;padding:.6rem 1.4rem;border-radius:8px;text-decoration:none;font-weight:600;transition:.2s}
.btn:hover{background:#5a52e0}.btn-outline{background:transparent;border:2px solid #6c63ff;color:#6c63ff}
.hero{text-align:center;padding:5rem 5% 4rem;background:linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%)}
.hero h1{font-size:3rem;font-weight:800;margin-bottom:1rem;color:#1a1a2e}.hero p{font-size:1.2rem;color:#555;max-width:600px;margin:0 auto 2rem}
.hero-btns{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}
.features{padding:4rem 5%;background:#fff}.features h2{text-align:center;font-size:2rem;margin-bottom:2.5rem}
.feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:2rem}
.feature-card{padding:2rem;border-radius:16px;background:#f8f7ff;border:1px solid #ede9fe}
.feature-icon{font-size:2rem;margin-bottom:1rem}.feature-card h3{margin-bottom:.5rem;color:#1a1a2e}.feature-card p{color:#666;line-height:1.6}
.cta{background:#6c63ff;color:#fff;text-align:center;padding:4rem 5%}
.cta h2{font-size:2rem;margin-bottom:1rem}.cta p{margin-bottom:2rem;opacity:.9}
.cta .btn{background:#fff;color:#6c63ff;font-size:1.1rem;padding:.8rem 2rem}
footer{text-align:center;padding:2rem;background:#1a1a2e;color:#aaa;font-size:.9rem}
</style>
</head>
<body>
<nav>
  <div class="logo">⚡ Brand</div>
  <div class="nav-links">
    <a href="#">Features</a><a href="#">Pricing</a><a href="#">About</a>
    <a href="#" class="btn" style="margin-left:1.5rem">Get Started</a>
  </div>
</nav>
<section class="hero">
  <h1>Build Something Amazing</h1>
  <p>The fastest way to create, launch, and grow your next big idea. Join thousands of builders today.</p>
  <div class="hero-btns">
    <a href="#" class="btn">Start for free →</a>
    <a href="#" class="btn btn-outline">Watch demo</a>
  </div>
</section>
<section class="features">
  <h2>Everything you need</h2>
  <div class="feature-grid">
    <div class="feature-card"><div class="feature-icon">🎯</div><h3>Easy to Use</h3><p>No coding required. Build powerful apps with our intuitive drag-and-drop interface.</p></div>
    <div class="feature-card"><div class="feature-icon">⚡</div><h3>Lightning Fast</h3><p>Optimized for performance. Your apps load instantly, keeping users engaged.</p></div>
    <div class="feature-card"><div class="feature-icon">🔒</div><h3>Secure by Default</h3><p>Enterprise-grade security built in. Your data is always protected and encrypted.</p></div>
    <div class="feature-card"><div class="feature-icon">📊</div><h3>Analytics Built-in</h3><p>Track your growth with real-time dashboards and actionable insights.</p></div>
    <div class="feature-card"><div class="feature-icon">🌍</div><h3>Global CDN</h3><p>Deployed on a worldwide network for ultra-low latency everywhere.</p></div>
    <div class="feature-card"><div class="feature-icon">🤝</div><h3>24/7 Support</h3><p>Our team is always here to help you succeed with dedicated support.</p></div>
  </div>
</section>
<section class="cta">
  <h2>Ready to get started?</h2>
  <p>Join over 10,000 businesses already using our platform.</p>
  <a href="#" class="btn">Start your free trial</a>
</section>
<footer><p>© 2025 Brand. All rights reserved.</p></footer>
</body></html>` }],
  },
  {
    name: "Portfolio",
    description: "A personal portfolio to showcase your work, skills, and contact info",
    category: "Personal",
    emoji: "💼",
    files: [{ filename: "index.html", language: "html", content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>My Portfolio</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#0f0f0f;color:#f0f0f0}
nav{display:flex;justify-content:space-between;align-items:center;padding:1.5rem 8%;position:fixed;width:100%;top:0;z-index:10;backdrop-filter:blur(10px);background:rgba(15,15,15,.8)}
.logo{font-weight:700;font-size:1.3rem;color:#64ffda}.nav-links a{margin-left:2rem;color:#ccc;text-decoration:none;font-size:.9rem;transition:.2s}
.nav-links a:hover{color:#64ffda}
.hero{min-height:100vh;display:flex;align-items:center;padding:0 8%;padding-top:80px}
.hero-content{max-width:600px}.hero-greeting{color:#64ffda;font-size:1rem;margin-bottom:1rem;font-family:monospace}
.hero h1{font-size:3.5rem;font-weight:800;line-height:1.1;margin-bottom:1rem}
.hero h2{font-size:2rem;color:#888;font-weight:400;margin-bottom:1.5rem}.hero p{color:#aaa;line-height:1.8;margin-bottom:2rem}
.btns{display:flex;gap:1rem}.btn{padding:.8rem 1.8rem;border-radius:8px;font-weight:600;cursor:pointer;text-decoration:none;transition:.2s}
.btn-primary{background:#64ffda;color:#0f0f0f}.btn-primary:hover{background:#52e8c4}
.btn-secondary{border:2px solid #64ffda;color:#64ffda;background:transparent}.btn-secondary:hover{background:rgba(100,255,218,.1)}
.about{padding:5rem 8%;background:#111}
.section-title{font-size:.8rem;color:#64ffda;letter-spacing:3px;text-transform:uppercase;margin-bottom:.5rem}
.about h2{font-size:2rem;margin-bottom:1.5rem}.about p{color:#aaa;line-height:1.8;max-width:600px;margin-bottom:1.5rem}
.skills{display:flex;flex-wrap:wrap;gap:.8rem;margin-top:1rem}
.skill{background:#1a1a1a;border:1px solid #333;padding:.4rem 1rem;border-radius:20px;font-size:.85rem;color:#64ffda;font-family:monospace}
.projects{padding:5rem 8%}.projects h2{font-size:2rem;margin-bottom:2rem}
.project-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.5rem}
.project-card{background:#111;border:1px solid #222;border-radius:12px;padding:2rem;transition:.3s}
.project-card:hover{border-color:#64ffda;transform:translateY(-4px)}.project-icon{font-size:2rem;margin-bottom:1rem}
.project-card h3{margin-bottom:.5rem}.project-card p{color:#888;font-size:.9rem;line-height:1.6;margin-bottom:1rem}
.project-tags{display:flex;flex-wrap:wrap;gap:.5rem}
.tag{background:#1a1a1a;color:#64ffda;padding:.2rem .7rem;border-radius:4px;font-size:.75rem;font-family:monospace}
.contact{padding:5rem 8%;background:#111;text-align:center}.contact h2{font-size:2rem;margin-bottom:1rem}
.contact p{color:#aaa;margin-bottom:2rem}.contact a{color:#64ffda}
</style>
</head>
<body>
<nav>
  <div class="logo">&lt;YourName /&gt;</div>
  <div class="nav-links"><a href="#about">About</a><a href="#projects">Work</a><a href="#contact">Contact</a></div>
</nav>
<section class="hero">
  <div class="hero-content">
    <p class="hero-greeting">// Hello, World! I'm</p>
    <h1>Your Name</h1>
    <h2>Full Stack Developer</h2>
    <p>I build fast, beautiful, and accessible web experiences. Currently open to new opportunities and exciting projects.</p>
    <div class="btns">
      <a href="#projects" class="btn btn-primary">View my work</a>
      <a href="#contact" class="btn btn-secondary">Contact me</a>
    </div>
  </div>
</section>
<section class="about" id="about">
  <p class="section-title">// about me</p>
  <h2>A bit about myself</h2>
  <p>I'm a passionate developer with 5 years of experience building web applications. I love turning complex problems into simple, elegant solutions.</p>
  <p>When I'm not coding, you'll find me hiking, reading sci-fi, or experimenting with new technologies.</p>
  <div class="skills"><span class="skill">React</span><span class="skill">TypeScript</span><span class="skill">Node.js</span><span class="skill">PostgreSQL</span><span class="skill">Tailwind CSS</span><span class="skill">Docker</span></div>
</section>
<section class="projects" id="projects">
  <p class="section-title">// my work</p>
  <h2>Featured Projects</h2>
  <div class="project-grid">
    <div class="project-card"><div class="project-icon">🛒</div><h3>E-Commerce Platform</h3><p>A full-featured online store with payments, inventory management, and analytics dashboard.</p><div class="project-tags"><span class="tag">React</span><span class="tag">Node.js</span><span class="tag">Stripe</span></div></div>
    <div class="project-card"><div class="project-icon">📊</div><h3>Analytics Dashboard</h3><p>Real-time data visualization platform processing millions of events per day.</p><div class="project-tags"><span class="tag">TypeScript</span><span class="tag">PostgreSQL</span><span class="tag">Chart.js</span></div></div>
    <div class="project-card"><div class="project-icon">🤖</div><h3>AI Writing Assistant</h3><p>A productivity app powered by GPT-4 to help users write better content faster.</p><div class="project-tags"><span class="tag">Next.js</span><span class="tag">OpenAI</span><span class="tag">Tailwind</span></div></div>
  </div>
</section>
<section class="contact" id="contact">
  <p class="section-title">// get in touch</p>
  <h2>Let's work together</h2>
  <p>I'm currently available for freelance work and full-time positions.</p>
  <a href="mailto:hello@yourname.com" class="btn btn-primary" style="display:inline-block">Say hello →</a>
</section>
</body></html>` }],
  },
  {
    name: "Dashboard",
    description: "An admin dashboard with stats, charts, and a data table",
    category: "Business",
    emoji: "📊",
    files: [{ filename: "index.html", language: "html", content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f1f5f9;color:#1e293b;display:flex}
.sidebar{width:240px;background:#1e293b;height:100vh;position:fixed;padding:1.5rem}
.sidebar-logo{color:#fff;font-size:1.2rem;font-weight:700;margin-bottom:2rem;display:flex;align-items:center;gap:.5rem}
.nav-item{display:flex;align-items:center;gap:.8rem;color:#94a3b8;padding:.7rem 1rem;border-radius:8px;cursor:pointer;margin-bottom:.3rem;transition:.2s}
.nav-item:hover,.nav-item.active{background:#334155;color:#fff}
.main{margin-left:240px;padding:2rem;flex:1}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem}
.header h1{font-size:1.5rem;font-weight:700}.header-right{display:flex;align-items:center;gap:1rem}
.avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6c63ff,#3b82f6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1.5rem;margin-bottom:2rem}
.stat-card{background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.stat-label{font-size:.8rem;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:.5rem}
.stat-value{font-size:2rem;font-weight:800;color:#1e293b}.stat-change{font-size:.8rem;margin-top:.3rem}
.stat-change.up{color:#10b981}.stat-change.down{color:#ef4444}
.cards{display:grid;grid-template-columns:2fr 1fr;gap:1.5rem}
.card{background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.card h2{font-size:1rem;font-weight:600;margin-bottom:1.5rem;color:#1e293b}
table{width:100%;border-collapse:collapse}th{text-align:left;font-size:.75rem;color:#64748b;text-transform:uppercase;padding:.5rem 0;border-bottom:1px solid #e2e8f0}
td{padding:.8rem 0;border-bottom:1px solid #f1f5f9;font-size:.9rem}
.badge{display:inline-flex;padding:.2rem .6rem;border-radius:20px;font-size:.75rem;font-weight:600}
.badge.success{background:#d1fae5;color:#059669}.badge.pending{background:#fef3c7;color:#d97706}.badge.failed{background:#fee2e2;color:#dc2626}
.activity-item{display:flex;align-items:center;gap:.8rem;margin-bottom:1rem}
.activity-dot{width:8px;height:8px;border-radius:50%;background:#6c63ff;flex-shrink:0}
.activity-text{font-size:.85rem;color:#475569}.activity-time{font-size:.75rem;color:#94a3b8;margin-left:auto}
</style>
</head>
<body>
<div class="sidebar">
  <div class="sidebar-logo">📊 AdminPro</div>
  <div class="nav-item active">🏠 Dashboard</div>
  <div class="nav-item">👥 Users</div>
  <div class="nav-item">📦 Products</div>
  <div class="nav-item">💳 Payments</div>
  <div class="nav-item">📈 Analytics</div>
  <div class="nav-item">⚙️ Settings</div>
</div>
<div class="main">
  <div class="header">
    <h1>Good morning, Admin 👋</h1>
    <div class="header-right">
      <span style="font-size:.85rem;color:#64748b">March 2025</span>
      <div class="avatar">A</div>
    </div>
  </div>
  <div class="stats">
    <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value">$48,295</div><div class="stat-change up">↑ 12.5% from last month</div></div>
    <div class="stat-card"><div class="stat-label">Active Users</div><div class="stat-value">3,842</div><div class="stat-change up">↑ 8.2% from last month</div></div>
    <div class="stat-card"><div class="stat-label">New Orders</div><div class="stat-value">1,274</div><div class="stat-change down">↓ 2.1% from last month</div></div>
    <div class="stat-card"><div class="stat-label">Conversion Rate</div><div class="stat-value">4.6%</div><div class="stat-change up">↑ 0.8% from last month</div></div>
  </div>
  <div class="cards">
    <div class="card">
      <h2>Recent Orders</h2>
      <table>
        <thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>#1042</td><td>Alice Johnson</td><td>$240.00</td><td><span class="badge success">Completed</span></td></tr>
          <tr><td>#1041</td><td>Bob Smith</td><td>$89.99</td><td><span class="badge pending">Pending</span></td></tr>
          <tr><td>#1040</td><td>Carol White</td><td>$340.00</td><td><span class="badge success">Completed</span></td></tr>
          <tr><td>#1039</td><td>David Lee</td><td>$59.99</td><td><span class="badge failed">Failed</span></td></tr>
          <tr><td>#1038</td><td>Eve Davis</td><td>$199.00</td><td><span class="badge success">Completed</span></td></tr>
        </tbody>
      </table>
    </div>
    <div class="card">
      <h2>Recent Activity</h2>
      <div class="activity-item"><div class="activity-dot"></div><div class="activity-text">New user registered</div><div class="activity-time">2m ago</div></div>
      <div class="activity-item"><div class="activity-dot" style="background:#10b981"></div><div class="activity-text">Order #1042 completed</div><div class="activity-time">15m ago</div></div>
      <div class="activity-item"><div class="activity-dot" style="background:#f59e0b"></div><div class="activity-text">Server usage at 80%</div><div class="activity-time">1h ago</div></div>
      <div class="activity-item"><div class="activity-dot" style="background:#ef4444"></div><div class="activity-text">Payment #1039 failed</div><div class="activity-time">2h ago</div></div>
      <div class="activity-item"><div class="activity-dot"></div><div class="activity-text">New product added</div><div class="activity-time">3h ago</div></div>
    </div>
  </div>
</div>
</body></html>` }],
  },
  {
    name: "Todo App",
    description: "An interactive task manager with add, complete, and delete functionality",
    category: "Productivity",
    emoji: "✅",
    files: [{ filename: "index.html", language: "html", content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Todo App</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem}
.app{background:#fff;border-radius:20px;padding:2rem;width:100%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,.2)}
h1{font-size:1.8rem;font-weight:800;color:#1a1a2e;margin-bottom:.3rem}
.subtitle{color:#888;font-size:.9rem;margin-bottom:1.5rem}
.stats{display:flex;gap:1rem;margin-bottom:1.5rem}
.stat{background:#f8f7ff;border-radius:10px;padding:.6rem 1rem;text-align:center;flex:1}
.stat-num{font-size:1.4rem;font-weight:700;color:#6c63ff}.stat-label{font-size:.7rem;color:#888}
.input-row{display:flex;gap:.5rem;margin-bottom:1.5rem}
.input-row input{flex:1;border:2px solid #e8e8f0;border-radius:10px;padding:.7rem 1rem;font-size:.95rem;outline:none;transition:.2s}
.input-row input:focus{border-color:#6c63ff}
.add-btn{background:#6c63ff;color:#fff;border:none;border-radius:10px;padding:.7rem 1.2rem;cursor:pointer;font-size:1.2rem;transition:.2s}
.add-btn:hover{background:#5a52e0}
.filters{display:flex;gap:.5rem;margin-bottom:1rem}
.filter-btn{padding:.4rem .9rem;border-radius:20px;border:2px solid #e8e8f0;background:transparent;cursor:pointer;font-size:.8rem;transition:.2s}
.filter-btn.active{background:#6c63ff;border-color:#6c63ff;color:#fff}
.todo-list{max-height:350px;overflow-y:auto}
.todo-item{display:flex;align-items:center;gap:.8rem;padding:.8rem;border-radius:10px;margin-bottom:.5rem;background:#f9f9f9;transition:.2s;animation:slideIn .3s ease}
@keyframes slideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
.todo-item:hover{background:#f0effe}
.check{width:20px;height:20px;border-radius:50%;border:2px solid #ddd;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.2s}
.check.done{background:#6c63ff;border-color:#6c63ff;color:#fff}
.todo-text{flex:1;font-size:.95rem;transition:.2s}.todo-text.done{text-decoration:line-through;color:#aaa}
.del-btn{background:none;border:none;color:#ddd;cursor:pointer;font-size:1rem;transition:.2s}.del-btn:hover{color:#ef4444}
.empty{text-align:center;padding:2rem;color:#aaa;font-size:.9rem}
</style>
</head>
<body>
<div class="app">
  <h1>My Tasks</h1>
  <p class="subtitle">Stay organized, stay productive.</p>
  <div class="stats">
    <div class="stat"><div class="stat-num" id="totalCount">0</div><div class="stat-label">Total</div></div>
    <div class="stat"><div class="stat-num" id="doneCount">0</div><div class="stat-label">Done</div></div>
    <div class="stat"><div class="stat-num" id="leftCount">0</div><div class="stat-label">Left</div></div>
  </div>
  <div class="input-row">
    <input id="input" type="text" placeholder="Add a new task...">
    <button class="add-btn" onclick="addTodo()">+</button>
  </div>
  <div class="filters">
    <button class="filter-btn active" onclick="setFilter('all',this)">All</button>
    <button class="filter-btn" onclick="setFilter('active',this)">Active</button>
    <button class="filter-btn" onclick="setFilter('done',this)">Done</button>
  </div>
  <div class="todo-list" id="list"></div>
</div>
<script>
let todos=[{id:1,text:'Design the homepage',done:true},{id:2,text:'Set up the database',done:false},{id:3,text:'Write unit tests',done:false}];
let filter='all';let nextId=4;
function save(){localStorage.setItem('todos',JSON.stringify(todos))}
function load(){const s=localStorage.getItem('todos');if(s)todos=JSON.parse(s);nextId=Math.max(...todos.map(t=>t.id),0)+1}
function addTodo(){const inp=document.getElementById('input');const t=inp.value.trim();if(!t)return;todos.unshift({id:nextId++,text:t,done:false});inp.value='';save();render()}
function toggle(id){const t=todos.find(t=>t.id===id);if(t){t.done=!t.done;save();render()}}
function del(id){todos=todos.filter(t=>t.id!==id);save();render()}
function setFilter(f,btn){filter=f;document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');render()}
function render(){
  const list=document.getElementById('list');
  const shown=todos.filter(t=>filter==='all'?true:filter==='done'?t.done:!t.done);
  document.getElementById('totalCount').textContent=todos.length;
  document.getElementById('doneCount').textContent=todos.filter(t=>t.done).length;
  document.getElementById('leftCount').textContent=todos.filter(t=>!t.done).length;
  if(!shown.length){list.innerHTML='<div class="empty">'+( filter==='done'?'No completed tasks yet.':'All caught up! Add a task above.')+'</div>';return}
  list.innerHTML=shown.map(t=>\`<div class="todo-item"><div class="check \${t.done?'done':''}" onclick="toggle(\${t.id})">\${t.done?'✓':''}</div><span class="todo-text \${t.done?'done':''}">\${t.text}</span><button class="del-btn" onclick="del(\${t.id})">✕</button></div>\`).join('');
}
document.getElementById('input').addEventListener('keydown',e=>{if(e.key==='Enter')addTodo()});
load();render();
</script>
</body></html>` }],
  },
  {
    name: "Blog",
    description: "A clean blog layout with featured posts and a sidebar",
    category: "Content",
    emoji: "📝",
    files: [{ filename: "index.html", language: "html", content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>My Blog</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;background:#fafaf8;color:#2d2d2d}
nav{background:#fff;border-bottom:1px solid #e8e4dc;padding:1rem 8%;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10}
.logo{font-size:1.4rem;font-weight:700;color:#2d2d2d}.logo span{color:#e87c3e}
.nav-links a{margin-left:1.5rem;text-decoration:none;color:#666;font-family:'Segoe UI',sans-serif;font-size:.9rem}
.hero-post{background:linear-gradient(to right,#1a1a2e,#16213e);color:#fff;padding:4rem 8%;margin-bottom:3rem}
.hero-tag{display:inline-block;background:#e87c3e;color:#fff;padding:.2rem .8rem;border-radius:20px;font-size:.75rem;font-family:'Segoe UI',sans-serif;font-weight:600;margin-bottom:1rem}
.hero-post h1{font-size:2.5rem;line-height:1.2;margin-bottom:1rem;max-width:700px}
.hero-post .meta{font-family:'Segoe UI',sans-serif;font-size:.85rem;color:#aaa;margin-bottom:1.5rem}
.hero-post p{color:#ccc;line-height:1.8;max-width:600px;margin-bottom:2rem}
.read-btn{display:inline-block;background:#e87c3e;color:#fff;padding:.6rem 1.5rem;border-radius:6px;text-decoration:none;font-family:'Segoe UI',sans-serif;font-weight:600;transition:.2s}
.read-btn:hover{background:#d4692e}
.content{display:grid;grid-template-columns:1fr 300px;gap:3rem;padding:0 8% 3rem;max-width:1200px;margin:0 auto}
.posts h2{font-size:1.2rem;margin-bottom:1.5rem;padding-bottom:.5rem;border-bottom:2px solid #e87c3e;font-family:'Segoe UI',sans-serif}
.post-card{display:grid;grid-template-columns:120px 1fr;gap:1.2rem;margin-bottom:2rem;padding-bottom:2rem;border-bottom:1px solid #e8e4dc}
.post-thumb{width:120px;height:80px;border-radius:8px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;font-size:2rem;flex-shrink:0}
.post-tag{font-family:'Segoe UI',sans-serif;font-size:.7rem;font-weight:700;color:#e87c3e;text-transform:uppercase;letter-spacing:1px;margin-bottom:.3rem}
.post-card h3{font-size:1.1rem;margin-bottom:.4rem;line-height:1.3}.post-card h3 a{text-decoration:none;color:#2d2d2d}
.post-card h3 a:hover{color:#e87c3e}.post-meta{font-family:'Segoe UI',sans-serif;font-size:.8rem;color:#888}
.sidebar h3{font-size:1rem;margin-bottom:1rem;padding-bottom:.5rem;border-bottom:2px solid #e87c3e;font-family:'Segoe UI',sans-serif}
.sidebar-section{margin-bottom:2rem}.category-list{list-style:none}
.category-list li{font-family:'Segoe UI',sans-serif;font-size:.9rem;padding:.5rem 0;border-bottom:1px solid #f0ece6;display:flex;justify-content:space-between}
.category-list li a{text-decoration:none;color:#555}.category-list li a:hover{color:#e87c3e}
.count{color:#aaa;font-size:.8rem}
.newsletter{background:#fff8f3;border:1px solid #f0d9c8;border-radius:10px;padding:1.5rem;text-align:center}
.newsletter p{font-family:'Segoe UI',sans-serif;font-size:.85rem;color:#666;margin-bottom:1rem}
.newsletter input{width:100%;border:1px solid #ddd;border-radius:6px;padding:.5rem .8rem;font-size:.85rem;margin-bottom:.5rem}
.newsletter button{width:100%;background:#e87c3e;color:#fff;border:none;border-radius:6px;padding:.6rem;cursor:pointer;font-family:'Segoe UI',sans-serif;font-weight:600}
</style>
</head>
<body>
<nav>
  <div class="logo">The<span>Blog</span></div>
  <div class="nav-links"><a href="#">Home</a><a href="#">Topics</a><a href="#">About</a><a href="#">Subscribe</a></div>
</nav>
<div class="hero-post">
  <div class="hero-tag">Featured</div>
  <h1>The Future of AI: What's Coming in the Next Decade</h1>
  <div class="meta">By Sarah Chen · March 15, 2025 · 8 min read</div>
  <p>Artificial intelligence is evolving faster than ever. From multimodal models to AI agents, here's what the next decade holds for technology and society.</p>
  <a href="#" class="read-btn">Read article →</a>
</div>
<div class="content">
  <div class="posts">
    <h2>Latest Articles</h2>
    <div class="post-card"><div class="post-thumb">🚀</div><div><div class="post-tag">Technology</div><h3><a href="#">10 Productivity Tools Every Developer Should Use in 2025</a></h3><div class="post-meta">Alex Rivera · March 12 · 5 min read</div></div></div>
    <div class="post-card"><div class="post-thumb">🌱</div><div><div class="post-tag">Lifestyle</div><h3><a href="#">How I Built a Morning Routine That Changed My Life</a></h3><div class="post-meta">Maya Patel · March 10 · 4 min read</div></div></div>
    <div class="post-card"><div class="post-thumb">💡</div><div><div class="post-tag">Business</div><h3><a href="#">The Startup Playbook: Lessons from 50 Failed Ventures</a></h3><div class="post-meta">Tom Walker · March 8 · 10 min read</div></div></div>
    <div class="post-card"><div class="post-thumb">🎨</div><div><div class="post-tag">Design</div><h3><a href="#">Why Minimalism is Making a Comeback in UI Design</a></h3><div class="post-meta">Lisa Kim · March 5 · 6 min read</div></div></div>
  </div>
  <aside class="sidebar">
    <div class="sidebar-section">
      <h3>Categories</h3>
      <ul class="category-list">
        <li><a href="#">Technology</a><span class="count">24</span></li>
        <li><a href="#">Business</a><span class="count">18</span></li>
        <li><a href="#">Design</a><span class="count">12</span></li>
        <li><a href="#">Lifestyle</a><span class="count">9</span></li>
        <li><a href="#">Science</a><span class="count">7</span></li>
      </ul>
    </div>
    <div class="sidebar-section newsletter">
      <h3>Newsletter</h3>
      <p>Get the best articles delivered to your inbox every week.</p>
      <input type="email" placeholder="Your email address">
      <button>Subscribe for free</button>
    </div>
  </aside>
</div>
</body></html>` }],
  },
  {
    name: "E-Commerce Store",
    description: "A product listing page with shopping cart and filters",
    category: "E-Commerce",
    emoji: "🛒",
    files: [{ filename: "index.html", language: "html", content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>My Store</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#f8fafc;color:#1e293b}
nav{background:#fff;padding:1rem 5%;display:flex;justify-content:space-between;align-items:center;box-shadow:0 1px 3px rgba(0,0,0,.08);position:sticky;top:0;z-index:10}
.logo{font-size:1.3rem;font-weight:800;color:#1e293b}.logo span{color:#6c63ff}
.nav-right{display:flex;align-items:center;gap:1.5rem}
.nav-right a{text-decoration:none;color:#64748b;font-size:.9rem}
.cart-btn{position:relative;background:#6c63ff;color:#fff;border:none;border-radius:10px;padding:.5rem 1rem;cursor:pointer;font-size:.9rem;display:flex;align-items:center;gap:.5rem}
.cart-count{position:absolute;top:-6px;right:-6px;background:#ef4444;color:#fff;border-radius:50%;width:18px;height:18px;font-size:.7rem;display:flex;align-items:center;justify-content:center;font-weight:700}
.banner{background:linear-gradient(135deg,#6c63ff,#3b82f6);color:#fff;text-align:center;padding:3rem 5%}
.banner h1{font-size:2.2rem;font-weight:800;margin-bottom:.5rem}.banner p{opacity:.9;font-size:1rem}
.shop-layout{display:grid;grid-template-columns:220px 1fr;gap:2rem;padding:2rem 5%}
.filters{background:#fff;border-radius:12px;padding:1.5rem;height:fit-content;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.filters h3{font-size:.85rem;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:1rem}
.filter-group{margin-bottom:1.5rem}
.filter-option{display:flex;align-items:center;gap:.5rem;margin-bottom:.6rem;cursor:pointer;font-size:.9rem}
.filter-option input{accent-color:#6c63ff}
.price-range input{width:100%;accent-color:#6c63ff;margin-bottom:.3rem}
.price-labels{display:flex;justify-content:space-between;font-size:.8rem;color:#64748b}
.products-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem}
.products-header h2{font-size:1.1rem}.sort-select{border:1px solid #e2e8f0;border-radius:8px;padding:.4rem .8rem;font-size:.85rem;background:#fff}
.product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1.2rem}
.product-card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);transition:.3s}
.product-card:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(0,0,0,.12)}
.product-img{height:160px;display:flex;align-items:center;justify-content:center;font-size:4rem;background:#f8f7ff}
.product-info{padding:1rem}.product-name{font-size:.9rem;font-weight:600;margin-bottom:.3rem}.product-category{font-size:.75rem;color:#64748b;margin-bottom:.5rem}
.product-price{font-size:1.1rem;font-weight:700;color:#6c63ff;margin-bottom:.8rem}
.add-btn{width:100%;background:#6c63ff;color:#fff;border:none;border-radius:8px;padding:.5rem;cursor:pointer;font-size:.85rem;transition:.2s}
.add-btn:hover{background:#5a52e0}.add-btn.added{background:#10b981}
</style>
</head>
<body>
<nav>
  <div class="logo">Shop<span>Now</span></div>
  <div class="nav-right">
    <a href="#">Home</a><a href="#">Products</a><a href="#">About</a>
    <button class="cart-btn" onclick="viewCart()">🛒 Cart<span class="cart-count" id="cartCount">0</span></button>
  </div>
</nav>
<div class="banner"><h1>🔥 Spring Sale — Up to 40% Off</h1><p>Shop the latest collection. Free shipping on orders over $50.</p></div>
<div class="shop-layout">
  <aside class="filters">
    <div class="filter-group"><h3>Category</h3>
      <label class="filter-option"><input type="checkbox" checked> All</label>
      <label class="filter-option"><input type="checkbox"> Electronics</label>
      <label class="filter-option"><input type="checkbox"> Clothing</label>
      <label class="filter-option"><input type="checkbox"> Books</label>
      <label class="filter-option"><input type="checkbox"> Home</label>
    </div>
    <div class="filter-group"><h3>Price Range</h3>
      <div class="price-range"><input type="range" min="0" max="500" value="500" oninput="document.getElementById('priceVal').textContent='$'+this.value"></div>
      <div class="price-labels"><span>$0</span><span id="priceVal">$500</span></div>
    </div>
    <div class="filter-group"><h3>Rating</h3>
      <label class="filter-option"><input type="radio" name="rating"> ⭐⭐⭐⭐⭐ & up</label>
      <label class="filter-option"><input type="radio" name="rating"> ⭐⭐⭐⭐ & up</label>
      <label class="filter-option"><input type="radio" name="rating" checked> All</label>
    </div>
  </aside>
  <div>
    <div class="products-header"><h2>24 Products</h2><select class="sort-select"><option>Sort: Featured</option><option>Price: Low to High</option><option>Price: High to Low</option><option>Newest</option></select></div>
    <div class="product-grid" id="productGrid"></div>
  </div>
</div>
<script>
const products=[
  {id:1,name:'Wireless Headphones',category:'Electronics',price:79.99,emoji:'🎧'},
  {id:2,name:'Running Shoes',category:'Clothing',price:129.99,emoji:'👟'},
  {id:3,name:'Coffee Maker',category:'Home',price:59.99,emoji:'☕'},
  {id:4,name:'JavaScript Mastery',category:'Books',price:34.99,emoji:'📚'},
  {id:5,name:'Smart Watch',category:'Electronics',price:199.99,emoji:'⌚'},
  {id:6,name:'Yoga Mat',category:'Home',price:29.99,emoji:'🧘'},
  {id:7,name:'Denim Jacket',category:'Clothing',price:89.99,emoji:'🧥'},
  {id:8,name:'Mechanical Keyboard',category:'Electronics',price:149.99,emoji:'⌨️'},
];
let cart=[];
function addToCart(id,btn){
  cart.push(id);
  document.getElementById('cartCount').textContent=cart.length;
  btn.textContent='✓ Added';btn.classList.add('added');
  setTimeout(()=>{btn.textContent='Add to Cart';btn.classList.remove('added')},1500);
}
function viewCart(){alert(\`Cart has \${cart.length} item(s). Total: $\${products.filter(p=>cart.includes(p.id)).reduce((s,p)=>s+p.price,0).toFixed(2)}\`);}
function render(){
  document.getElementById('productGrid').innerHTML=products.map(p=>\`
    <div class="product-card">
      <div class="product-img">\${p.emoji}</div>
      <div class="product-info">
        <div class="product-name">\${p.name}</div>
        <div class="product-category">\${p.category}</div>
        <div class="product-price">$\${p.price}</div>
        <button class="add-btn" onclick="addToCart(\${p.id},this)">Add to Cart</button>
      </div>
    </div>\`).join('');
}
render();
</script>
</body></html>` }],
  },
];

async function seedTemplates() {
  const existing = await db.select().from(templatesTable);
  if (existing.length > 0) {
    console.log(`Templates already seeded (${existing.length} found), skipping.`);
    return;
  }
  for (const t of templates) {
    await db.insert(templatesTable).values(t);
    console.log(`Seeded: ${t.name}`);
  }
  console.log("All templates seeded.");
}

seedTemplates().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
