// DemoBank — script.js (compatible, defensive)
// All demo state is local to the browser (localStorage). No data is sent anywhere.
// Key: "demoBank_user" stores { username, account, balance, transactions, profile }

(function(){
  try {
    // Utility functions
    function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
    function formatCurrency(v){
      v = Number(v || 0);
      return '$' + v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
    }
    function nowISO(){ return new Date().toISOString(); }
    function maskAccount(num){
      var s = String(num || '');
      return '****' + s.slice(-4);
    }

    // Default sample names and merchants
    var SAMPLE = {
      name: 'Alex Johnson',
      merchants: ['Coffee House','Grocery Mart','Electric Co.','Online Store','Gym Membership','Salary','Rent','Restaurant']
    };

    // Create sample transactions
    function makeSampleTransactions(count, balanceStart){
      count = typeof count === 'number' ? count : 8;
      balanceStart = typeof balanceStart === 'number' ? balanceStart : 10000;
      var tx = [];
      var balance = balanceStart;
      for(var i=0;i<count;i++){
        var credit = Math.random() > 0.6;
        var amount = Number((Math.random()*900 + 10).toFixed(2));
        var merchant = SAMPLE.merchants[randInt(0,SAMPLE.merchants.length-1)];
        var date = new Date(Date.now() - randInt(0,60)*24*3600*1000 - randInt(0,86400)*1000);
        if(credit){ balance += amount; } else { balance -= amount; if(balance < 0) balance = 0; }
        tx.push({
          id: 'tx_' + Math.random().toString(36).slice(2,10),
          date: date.toISOString(),
          merchant: merchant,
          amount: amount,
          type: credit ? 'credit' : 'debit',
          balance: Number(balance.toFixed(2))
        });
      }
      // newest first
      tx.sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
      return tx;
    }

    // Data helpers
    function saveUserData(data){
      try {
        localStorage.setItem('demoBank_user', JSON.stringify(data));
      } catch(e){
        console.error('Could not save demo data to localStorage:', e);
      }
    }
    function loadUserData(){
      try {
        var raw = localStorage.getItem('demoBank_user');
        return raw ? JSON.parse(raw) : null;
      } catch(e){
        console.error('Could not read demo data from localStorage:', e);
        return null;
      }
    }

    // Public functions used by pages
    window.generateDemoData = function(username){
      var uname = String(username || 'DemoUser').slice(0,32);
      var acctNum = '' + (10000000 + randInt(0,89999999));
      var balance = Number((Math.random() * 50000 + 1000).toFixed(2));
      var transactions = makeSampleTransactions(10, balance);
      var data = {
        username: uname,
        account: {
          name: SAMPLE.name,
          number: acctNum
        },
        balance: balance,
        transactions: transactions,
        profile: {
          name: SAMPLE.name,
          phone: '(555) 555-5555',
          email: 'alex@example.com'
        },
        createdAt: nowISO()
      };
      saveUserData(data);
      return data;
    };

    window.initDashboard = function(){
      var data = loadUserData();
      if(!data){
        data = generateDemoData('DemoUser');
      }
      var acctNameEl = document.getElementById('acctName');
      var acctNumberEl = document.getElementById('acctNumber');
      var balanceEl = document.getElementById('balance');
      var list = document.getElementById('recentList');

      var profileName = (data && data.profile && data.profile.name) ? data.profile.name : (data && data.account && data.account.name ? data.account.name : (data && data.username ? data.username : ''));

      if(acctNameEl) acctNameEl.textContent = profileName;
      if(acctNumberEl) acctNumberEl.textContent = maskAccount((data && data.account && data.account.number) ? data.account.number : '');
      if(balanceEl) balanceEl.textContent = formatCurrency(data && data.balance ? data.balance : 0);

      if(list && Array.isArray(data.transactions)){
        var recent = data.transactions.slice(0,5);
        list.innerHTML = '';
        recent.forEach(function(t){
          var li = document.createElement('li');
          li.innerHTML = '<div><strong>' + (t.merchant || '') + '</strong><div class="muted">' + (new Date(t.date)).toLocaleDateString() + '</div></div>' +
                         '<div><div class="' + (t.type==='credit' ? 'accent' : '') + '">' + (t.type==='credit' ? '+' : '-') + formatCurrency(t.amount) + '</div>' +
                         '<div class="muted">' + formatCurrency(t.balance) + '</div></div>';
          list.appendChild(li);
        });
      }
    };

    window.renderTransactionsPage = function(){
      var data = loadUserData();
      var root = document.getElementById('transactionsList');
      if(!data){
        if(root) root.innerHTML = '<li class="muted">No demo data. Start from Home or Demo Login.</li>';
        return;
      }
      var filterEl = document.getElementById('filterType');
      var filter = filterEl ? filterEl.value : 'all';
      var tx = Array.isArray(data.transactions) ? data.transactions.filter(function(t){ return filter === 'all' ? true : t.type === filter; }) : [];
      if(!root) return;
      root.innerHTML = '';
      tx.forEach(function(t){
        var li = document.createElement('li');
        li.innerHTML = '<div><strong>' + (t.merchant || '') + '</strong><div class="muted">' + (new Date(t.date)).toLocaleString() + '</div></div>' +
                       '<div><div class="' + (t.type === 'credit' ? 'accent' : '') + '">' + (t.type === 'credit' ? '+' : '-') + formatCurrency(t.amount) + '</div>' +
                       '<div class="muted">Bal ' + formatCurrency(t.balance) + '</div></div>';
        root.appendChild(li);
      });
      if(tx.length === 0) root.innerHTML = '<li class="muted">No transactions match the filter.</li>';
    };

    window.doTransfer = function(opts){
      opts = opts || {};
      var to = opts.to || 'Demo Recipient';
      var amount = typeof opts.amount === 'number' ? opts.amount : Number(opts.amount || 0);
      var note = opts.note || '';
      var data = loadUserData();
      if(!data) return {success:false, message:'No demo account found.'};
      if(typeof amount !== 'number' || isNaN(amount) || amount <= 0) return {success:false, message:'Enter a valid amount.'};
      if(amount > data.balance) return {success:false, message:'Insufficient demo balance.'};

      var newBalance = Number((data.balance - amount).toFixed(2));
      data.balance = newBalance;
      var tx = {
        id: 'tx_' + Math.random().toString(36).slice(2,10),
        date: nowISO(),
        merchant: 'Transfer to ' + to,
        amount: Number(amount.toFixed(2)),
        type: 'debit',
        balance: newBalance,
        note: note
      };
      if(!Array.isArray(data.transactions)) data.transactions = [];
      data.transactions.unshift(tx);
      saveUserData(data);
      return {success:true, newBalance: formatCurrency(newBalance), tx: tx};
    };

    window.loadProfilePage = function(){
      var data = loadUserData() || generateDemoData('DemoUser');
      var fullname = document.getElementById('fullname');
      var phone = document.getElementById('phone');
      var email = document.getElementById('email');
      if(fullname) fullname.value = (data.profile && data.profile.name) ? data.profile.name : (data.account && data.account.name ? data.account.name : '');
      if(phone) phone.value = (data.profile && data.profile.phone) ? data.profile.phone : '';
      if(email) email.value = (data.profile && data.profile.email) ? data.profile.email : '';
    };

    window.saveProfile = function(profile){
      var data = loadUserData() || generateDemoData('DemoUser');
      data.profile = data.profile || {};
      profile = profile || {};
      if(typeof profile.name === 'string') data.profile.name = profile.name;
      if(typeof profile.phone === 'string') data.profile.phone = profile.phone;
      if(typeof profile.email === 'string') data.profile.email = profile.email;
      saveUserData(data);
    };

    // Expose for debugging (only in dev env)
    window._demoBank = {
      load: loadUserData,
      save: saveUserData,
      generate: generateDemoData
    };

    // Helpful console message
    if(typeof console !== 'undefined' && console.info){
      console.info('DemoBank script loaded. Use generateDemoData(), initDashboard(), renderTransactionsPage() from console for testing.');
    }
  } catch (err) {
    if(typeof console !== 'undefined' && console.error){
      console.error('DemoBank script error:', err);
    }
  }
})();