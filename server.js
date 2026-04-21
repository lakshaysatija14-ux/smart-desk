// ============================================================
//  HARDWARE SYNC FUNCTION
// ============================================================
async function syncWithHardware(data) {
    try {
        await fetch('https://smartdesk-backend-lovat.vercel.app/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (e) {
        console.error('Error syncing with hardware API:', e);
    }
}

function syncTasks() {
    const ul = document.getElementById('taskList');
    if (!ul) return;
    const tasksArray = Array.from(ul.querySelectorAll('.task-item')).map(li => ({
        title: li.querySelector('.task-text') ? li.querySelector('.task-text').innerText : '',
        done: li.classList.contains('done')
    }));
    syncWithHardware({ tasks: tasksArray });
}

function syncMessages() {
    const msgListEl = document.getElementById('msgList');
    if (!msgListEl) return;
    const msgs = Array.from(msgListEl.querySelectorAll('.msg-item')).map(msg => ({
        sender: msg.querySelector('.msg-name') ? msg.querySelector('.msg-name').innerText : '',
        time: msg.querySelector('.msg-time') ? msg.querySelector('.msg-time').innerText : '',
        text: msg.querySelector('.msg-text') ? msg.querySelector('.msg-text').innerText : '',
        isDesk: msg.querySelector('.av-desk') ? true : false
    }));
    syncWithHardware({ deskMessages: msgs });
}

function syncCalendar() {
    setTimeout(() => {
        const events = Array.from(document.querySelectorAll('.cal-date.has-event')).map(cell => {
            const dateNum = cell.childNodes[0] ? cell.childNodes[0].textContent.trim() : cell.textContent.trim();
            const tags = Array.from(cell.querySelectorAll('.event-tag')).map(t => t.innerText);
            return { date: parseInt(dateNum), events: tags };
        });
        syncWithHardware({ calendarEvents: events });
    }, 50);
}

// ============================================================
//  UTILITIES
// ============================================================
    function getTimeStr() {
        const now = new Date();
        let h = now.getHours();
        let m = now.getMinutes();
        const ap = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        m = m < 10 ? '0' + m : m;
        return `${h < 10 ? '0' + h : h}:${m} ${ap}`;
    }

    function padTwo(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    // ============================================================
    //  1. CLOCK  ─ updates every second
    // ============================================================
    function updateClock() {
        const now  = new Date();
        let h      = now.getHours();
        const m    = now.getMinutes();
        const ap   = h >= 12 ? 'PM' : 'AM';
        h          = h % 12 || 12;
        document.getElementById('clock').innerText =
            `${padTwo(h)}:${padTwo(m)} ${ap}`;
        const opts = { weekday: 'short', month: 'short', day: 'numeric' };
        document.getElementById('date').innerText =
            now.toLocaleDateString('en-US', opts);
    }
    setInterval(updateClock, 1000);
    updateClock();

    // ============================================================
    //  2. MESSAGE SYSTEM
    // ============================================================
    const sendInput = document.querySelector('.input-desk');
    const sendBtn   = document.querySelector('.btn-send');
    const msgList   = document.getElementById('msgList');

    function createMsgItem(name, avatarClass, text, time, isDesk) {
        const div = document.createElement('div');
        div.className = 'msg-item';
        div.innerHTML = `
            <div class="msg-avatar ${avatarClass}">${isDesk ? 'Desk' : 'You'}</div>
            <div class="msg-content">
                <div class="msg-head">
                    <span class="msg-name">${name}</span>
                    <span class="msg-time">${time}</span>
                </div>
                <div class="msg-text">${isDesk
                    ? text + ' <i class="fa-solid fa-square-check" style="color:var(--green);"></i>'
                    : text
                }</div>
            </div>`;
        return div;
    }

    function sendDeskMessage() {
        const text = sendInput.value.trim();
        if (!text) return;

        const t = getTimeStr();
        msgList.appendChild(createMsgItem('You',  'av-you',  text,               t,     false));
        msgList.scrollTop = msgList.scrollHeight;

        setTimeout(() => {
            // msgList.appendChild(createMsgItem('Desk', 'av-desk', 'Message received', getTimeStr(), true));
            msgList.scrollTop = msgList.scrollHeight;
        }, 600);

        sendInput.value = '';
    }

    sendBtn.addEventListener('click', sendDeskMessage);
    sendInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendDeskMessage();
    });

    document.getElementById('clearMessages').addEventListener('click', () => {
        msgList.innerHTML = '';
    });

    // Start sync observation for Messages
    const msgObserver = new MutationObserver(() => syncMessages());
    if (msgList) {
        msgObserver.observe(msgList, { childList: true, subtree: true });
    }

    // ============================================================
    //  3. WEATHER SYSTEM  (OpenWeatherMap API)
    // ============================================================
    let weatherApiKey = '8669018300070c64718b01069c69bee7';
    let currentCity   = 'Delhi';

    const wBadge  = document.querySelector('.w-badge');
    const tempEl  = document.querySelector('.temp');
    const wDescEl = document.querySelector('.w-desc');
    const wIconEl = document.querySelector('.w-icon i');
    const wStats  = document.querySelector('.w-stats');

    const ICON_MAP = {
        Clear       : { cls: 'fa-sun',         color: '#facc15' },
        Clouds      : { cls: 'fa-cloud',        color: '#94a3b8' },
        Rain        : { cls: 'fa-cloud-rain',   color: '#60a5fa' },
        Drizzle     : { cls: 'fa-cloud-drizzle',color: '#60a5fa' },
        Thunderstorm: { cls: 'fa-bolt',         color: '#fbbf24' },
        Snow        : { cls: 'fa-snowflake',    color: '#bae6fd' },
        Mist        : { cls: 'fa-smog',         color: '#9ca3af' },
        Smoke       : { cls: 'fa-smog',         color: '#9ca3af' },
        Haze        : { cls: 'fa-smog',         color: '#9ca3af' },
        Fog         : { cls: 'fa-smog',         color: '#9ca3af' },
        Tornado     : { cls: 'fa-tornado',      color: '#f87171' },
    };

    async function fetchWeather(city) {
        // Prompt for API key if not stored
        

        wBadge.textContent = 'Loading…';

        try {
            const url  = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${weatherApiKey}&units=metric`;
            const res  = await fetch(url);
            const data = await res.json();

            if (data.cod !== 200) {
                alert(`⚠️ Weather error: ${data.message}`);
                wBadge.textContent = currentCity;
                return;
            }

            // Temperature
            tempEl.textContent = `${Math.round(data.main.temp)}°C`;

            // Description (capitalised)
            const desc = data.weather[0].description;
            wDescEl.textContent = desc.charAt(0).toUpperCase() + desc.slice(1);

            // City badge
            currentCity = city;
            wBadge.textContent = `${data.name}, ${data.sys.country}`;

            // Icon
            const condition = data.weather[0].main;
            const icon = ICON_MAP[condition] || { cls: 'fa-cloud-sun', color: '#facc15' };
            wIconEl.className = `fa-solid ${icon.cls}`;
            wIconEl.style.color = icon.color;

            // Stats (wind: m/s → km/h)
            wStats.innerHTML = `
                <span>Humidity <b>${data.main.humidity}%</b></span> |
                <span>Wind <b>${Math.round(data.wind.speed * 3.6)} km/h</b></span> |
                <span>Feels <b>${Math.round(data.main.feels_like)}°</b></span>`;
                
            // SYNC NEW WEATHER TO HARDWARE
            syncWithHardware({
                weather: {
                    temp: Math.round(data.main.temp),
                    condition: desc.charAt(0).toUpperCase() + desc.slice(1),
                    humidity: data.main.humidity,
                    city: data.name
                }
            });
        } catch (err) {
            alert('❌ Could not fetch weather. Check API key & internet.');
            weatherApiKey = '';   // reset so user can retry
            wBadge.textContent = currentCity;
        }
    }

    // Clicking the badge lets you change city
    wBadge.addEventListener('click', () => {
        const city = prompt('Enter city name:', currentCity);
        if (city && city.trim()) fetchWeather(city.trim());
    });

    // ============================================================
    //  4. ALARM SYSTEM
    // ============================================================
    const hourBox  = document.getElementById('alarmHour');
    const minBox   = document.getElementById('alarmMin');
    const ampmBox  = document.getElementById('alarmAmPm');
    const alarmBtn = document.querySelector('.btn-alarm');
    const alarmCard = document.querySelector('.alarm-card');

    let alarmAmPm = 'PM';

    // Toggle AM/PM
    ampmBox.addEventListener('click', () => {
        alarmAmPm = alarmAmPm === 'PM' ? 'AM' : 'PM';
        ampmBox.innerHTML = `${alarmAmPm} <i class="fa-solid fa-chevron-down" style="font-size:0.8rem;margin-left:5px;"></i>`;
    });

    // Validate + format contenteditable boxes on blur
    function validateBox(el, min, max) {
        let v = parseInt(el.innerText.replace(/\D/g, ''));
        if (isNaN(v) || v < min) v = min;
        if (v > max)              v = max;
        el.innerText = padTwo(v);
    }

    hourBox.addEventListener('blur', () => validateBox(hourBox, 1, 12));
    minBox.addEventListener('blur',  () => validateBox(minBox,  0, 59));

    // Select-all on click for easy editing
    [hourBox, minBox].forEach(box => {
        box.addEventListener('click', () => {
            const range = document.createRange();
            range.selectNodeContents(box);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        });
        // Allow only digits
        box.addEventListener('keypress', e => {
            if (!/[0-9]/.test(e.key)) e.preventDefault();
        });
    });

    // Audio beep using Web Audio API
    function playAlarmSound() {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            const ctx = new Ctx();
            [0, 0.55, 1.1, 1.65, 2.2].forEach(offset => {
                const osc  = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.value = 880;
                gain.gain.setValueAtTime(0.8, ctx.currentTime + offset);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.45);
                osc.start(ctx.currentTime + offset);
                osc.stop(ctx.currentTime + offset + 0.45);
            });
        } catch (_) {}
    }

    let activeAlarm     = null;
    let alarmInterval   = null;

    alarmBtn.addEventListener('click', () => {
        const h  = parseInt(hourBox.innerText.trim());
        const m  = parseInt(minBox.innerText.trim());
        const ap = alarmAmPm;

        if (isNaN(h) || isNaN(m) || h < 1 || h > 12 || m < 0 || m > 59) {
            alert('⚠️ Please enter a valid time.');
            return;
        }

        activeAlarm = { h, m, ap };
        if (alarmInterval) clearInterval(alarmInterval);
        alarmInterval = setInterval(checkAlarm, 1000);

        alert(`✅ Alarm set for ${padTwo(h)}:${padTwo(m)} ${ap}`);
        
        syncWithHardware({ alarms: [`${padTwo(h)}:${padTwo(m)} ${ap}`] });
    });

    function checkAlarm() {
        if (!activeAlarm) return;
        const now  = new Date();
        let curH   = now.getHours();
        const curM = now.getMinutes();
        const curS = now.getSeconds();
        const curAp = curH >= 12 ? 'PM' : 'AM';
        curH = curH % 12 || 12;

        if (curH === activeAlarm.h && curM === activeAlarm.m &&
            curAp === activeAlarm.ap && curS === 0) {

            clearInterval(alarmInterval);
            playAlarmSound();
            alarmCard.classList.add('alarm-ringing');

            setTimeout(() => {
                alarmCard.classList.remove('alarm-ringing');
                alert(`⏰ ALARM! It's ${padTwo(activeAlarm.h)}:${padTwo(activeAlarm.m)} ${activeAlarm.ap}!`);
            }, 100);

            activeAlarm = null;
        }
    }

    // ============================================================
    //  5. CALENDAR  ─ click any date to add an event
    // ============================================================
    const TAG_CLASSES = ['tag-blue', 'tag-purple', 'tag-orange', 'tag-pink', 'tag-green'];
    let tagIdx = 0;

    document.querySelectorAll('.cal-date.curr-month').forEach(cell => {
        cell.addEventListener('click', () => {
            // Safe extraction of just the numeric date text
            const dateNum = parseInt(cell.childNodes[0].textContent.trim() ||
                                     cell.textContent.trim());
            if (isNaN(dateNum)) return;

            const evtName = (prompt(`📅 Add event for April ${dateNum}, 2026:`) || '').trim();
            if (!evtName) return;

            // Mark dot
            cell.classList.add('has-event');

            // Append event tag
            cell.style.position = 'relative';
            const tag = document.createElement('div');
            tag.className = `event-tag ${TAG_CLASSES[tagIdx % TAG_CLASSES.length]}`;
            tag.textContent = evtName.length > 12 ? evtName.slice(0, 11) + '…' : evtName;
            cell.appendChild(tag);
            tagIdx++;
            
            syncCalendar();
        });
    });

    // ============================================================
    //  6. TO-DO LIST
    // ============================================================
    function toggleTask(el) {
        el.classList.toggle('done');
    }

    function addTask() {
        const input = document.getElementById('taskInput');
        const text  = input.value.trim();
        if (!text) return;

        const ul = document.getElementById('taskList');
        const li = document.createElement('li');
        li.className = 'task-item';
        li.setAttribute('onclick', 'toggleTask(this)');
        li.innerHTML = `
            <div class="task-left">
                <div class="check-box"></div>
                <span class="task-text">${text}</span>
            </div>
            <div style="display:flex;gap:10px;align-items:center;">
                <span class="task-time">${getTimeStr()}</span>
                <button class="task-del"
                    onclick="event.stopPropagation();this.parentElement.parentElement.remove()">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>`;
        ul.insertBefore(li, ul.firstChild);
        input.value = '';
    }

    document.getElementById('taskInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') addTask();
    });

    document.getElementById('clearCompleted').addEventListener('click', () => {
        document.querySelectorAll('.task-item.done').forEach(t => t.remove());
    });

    // Start sync observation for Tasks
    const taskObserver = new MutationObserver(() => syncTasks());
    const ulList = document.getElementById('taskList');
    if (ulList) {
        taskObserver.observe(ulList, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    // ============================================================
    //  7. QUOTE / INSPIRATION  ─ refresh button cycles quotes
    // ============================================================
    const QUOTES = [
        { text: "The secret of getting ahead is getting started.",            author: "Mark Twain" },
        { text: "It always seems impossible until it's done.",                author: "Nelson Mandela" },
        { text: "Don't watch the clock; do what it does. Keep going.",        author: "Sam Levenson" },
        { text: "The future depends on what you do today.",                   author: "Mahatma Gandhi" },
        { text: "Success is not final, failure is not fatal.",                author: "Winston Churchill" },
        { text: "Believe you can and you're halfway there.",                  author: "Theodore Roosevelt" },
        { text: "Act as if what you do makes a difference. It does.",         author: "William James" },
        { text: "You are never too old to set another goal.",                 author: "C.S. Lewis" },
        { text: "Energy and persistence conquer all things.",                 author: "Benjamin Franklin" },
        { text: "Little by little, one travels far.",                         author: "J.R.R. Tolkien" },
        { text: "What you do today can improve all your tomorrows.",          author: "Ralph Marston" },
        { text: "Push yourself, because no one else is going to do it.",      author: "Unknown" },
    ];

    const quoteEl   = document.querySelector('.quote');
    const authorEl  = document.querySelector('.author');
    const refreshBtn = document.querySelector('.refresh-btn');
    let quoteIdx = 0;

    refreshBtn.addEventListener('click', () => {
        quoteIdx = (quoteIdx + 1) % QUOTES.length;
        quoteEl.style.opacity  = '0';
        authorEl.style.opacity = '0';
        setTimeout(() => {
            quoteEl.textContent  = `"${QUOTES[quoteIdx].text}"`;
            authorEl.textContent = `— ${QUOTES[quoteIdx].author}`;
            quoteEl.style.opacity  = '1';
            authorEl.style.opacity = '1';
            
            syncWithHardware({ quotes: `${QUOTES[quoteIdx].text} — ${QUOTES[quoteIdx].author}` });
        }, 350);
    });

    // ============================================================
    //  8. NAV MENU  ─ active tab highlight
    // ============================================================
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // ============================================================
    //  9. QUICK ACTIONS
    // ============================================================
    // Refresh
    document.getElementById('actionRefresh').addEventListener('click', () => {
        location.reload();
    });

    // Sync → re-fetch weather with current city
    document.getElementById('actionSync').addEventListener('click', () => {
        if (weatherApiKey) {
            fetchWeather(currentCity);
        } else {
            const city = prompt('Enter city to fetch weather:', 'Delhi');
            if (city) fetchWeather(city.trim());
        }
    });

    // Dark toggle (subtle brightness shift for fun)
    let darkerMode = false;
    document.getElementById('actionDark').addEventListener('click', () => {
        darkerMode = !darkerMode;
        document.body.style.filter = darkerMode ? 'brightness(0.75) saturate(1.2)' : '';
        document.getElementById('actionDark').querySelector('div').style.background =
            darkerMode ? 'rgba(139,92,246,0.3)' : '';
    });

    // Help
    document.getElementById('actionHelp').addEventListener('click', () => {
        alert(
            '📌 Smart Desk — Quick Help\n\n' +
            '📨 Send to Desk  →  Type a message & press SEND or Enter\n' +
            '🌤 Weather       →  Click the city badge to change city\n' +
            '                    (requires a free OpenWeatherMap API key)\n' +
            '⏰ Alarm         →  Edit the hour/minute boxes, toggle AM/PM,\n' +
            '                    then click SET ALARM\n' +
            '📅 Calendar      →  Click any date to add an event\n' +
            '✅ To-Do         →  Click a task to toggle done; ➕ to add new\n' +
            '💡 Inspiration   →  Click the refresh ↻ button for a new quote\n' +
            '⚡ Quick Actions →  Refresh, Sync weather, Dim, Help'
        );
    });
    // ✅ AUTO WEATHER LOAD
    fetchWeather('Delhi');