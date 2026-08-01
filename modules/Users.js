// Users.js - Manages user accounts, roles, departments, search, additions, and user grievance viewing
const Users = {
  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a;">Users Directory & Grievances Dashboard</h2>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">Manage system users, assign authority roles, and view user-wise grievance records</p>
        </div>
        <div style="display: flex; gap: 12px; align-items: center;">
          <button class="btn btn-primary" onclick="openAddUserModal()" style="margin: 0; background: #16a34a; border-color: #16a34a; display: flex; align-items: center; gap: 8px; font-weight: 700; border-radius: 8px; padding: 10px 18px; cursor: pointer;">
            + Add New User
          </button>
        </div>
      </div>

      <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(15,23,42,0.02);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            <span style="font-size: 12px; font-weight: 700; color: #64748b; margin-right: 4px;">Filter Role:</span>
            <button class="filter-pill active" onclick="Users.filterByRole('all', this)" style="padding: 5px 12px; font-size: 12px; font-weight: 700;">All Roles</button>
            <button class="filter-pill" onclick="Users.filterByRole('Citizen', this)" style="padding: 5px 12px; font-size: 12px; font-weight: 700;">Citizens</button>
            <button class="filter-pill" onclick="Users.filterByRole('Authority', this)" style="padding: 5px 12px; font-size: 12px; font-weight: 700;">Authorities</button>
            <button class="filter-pill" onclick="Users.filterByRole('Officer', this)" style="padding: 5px 12px; font-size: 12px; font-weight: 700;">Officers</button>
          </div>

          <div style="position: relative;">
            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 14px;">🔍</span>
            <input type="text" id="user-search-input" placeholder="Search user name, email..." style="padding: 9px 14px 9px 34px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; width: 260px; font-family: inherit;">
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table class="admin-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
                <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Name</th>
                <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Email / Phone</th>
                <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Role</th>
                <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Department</th>
                <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Status</th>
                <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Actions</th>
              </tr>
            </thead>
            <tbody id="users-table-body"></tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #64748b;">
          <div id="users-page-info">Showing registered users</div>
          <div style="display: flex; gap: 6px;" id="users-pagination-btns">
            <button onclick="Users.changePage(-1)" style="padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: pointer; color: #475569; font-weight: 600;">&lt;</button>
            <button style="padding: 6px 12px; border: 1px solid #16a34a; border-radius: 6px; background: #16a34a; cursor: pointer; color: #fff; font-weight: 700;">1</button>
            <button onclick="Users.changePage(1)" style="padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: pointer; color: #475569; font-weight: 600;">&gt;</button>
          </div>
        </div>
      </div>

      <!-- User Grievances Modal Container -->
      <div id="user-grievances-modal" class="modal-overlay"></div>
    `;

    document.getElementById('user-search-input').addEventListener('input', (e) => {
      filterUsersTable(e.target.value);
    });

    this.loadData();
  },

  loadData() {
    if (typeof loadUsersTable === 'function') {
      loadUsersTable();
    }
  },

  filterByRole(roleFilter, btn) {
    document.querySelectorAll('#auth-tab-users .filter-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const trs = document.querySelectorAll('#users-table-body tr');
    trs.forEach(tr => {
      if (roleFilter === 'all') {
        tr.style.display = '';
      } else {
        const text = tr.innerText.toLowerCase();
        if (text.includes(roleFilter.toLowerCase())) {
          tr.style.display = '';
        } else {
          tr.style.display = 'none';
        }
      }
    });
  },

  changePage(dir) {
    alert('Displaying all registered user records.');
  },

  updateUserRole(userId, newRole) {
    const token = localStorage.getItem('prajamitra_token');
    fetch((window.API_BASE || '') + '/api/users/update-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ id: userId, role: newRole })
    })
    .then(res => {
      if (!res.ok) throw new Error();
      alert('User role updated successfully to: ' + newRole);
      this.loadData();
    })
    .catch(err => alert('Failed to update user role.'));
  },

  updateUserDepartment(userId, newDept) {
    const token = localStorage.getItem('prajamitra_token');
    fetch((window.API_BASE || '') + '/api/users/update-department', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ id: userId, department: newDept })
    })
    .then(res => {
      if (!res.ok) throw new Error();
      alert('User department assignment updated successfully to: ' + newDept);
      this.loadData();
    })
    .catch(err => alert('Failed to update user department.'));
  },

  toggleUserStatus(userId, currentStatus) {
    const newStatus = (currentStatus || 'Active').toLowerCase() === 'active' ? 'Inactive' : 'Active';
    const token = localStorage.getItem('prajamitra_token');
    fetch((window.API_BASE || '') + '/api/users/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ id: userId, status: newStatus })
    })
    .then(res => {
      if (!res.ok) throw new Error();
      alert(`User status changed to ${newStatus}`);
      this.loadData();
    })
    .catch(err => alert('Failed to change user status.'));
  },

  viewUserGrievances(userEmail) {
    const modal = document.getElementById('user-grievances-modal');
    if (!modal) return;

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 720px; width: 90%; padding: 28px; text-align: left; background:#fff; border-radius:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 18px; border-bottom:1px solid #e2e8f0; padding-bottom:12px;">
          <div>
            <h3 style="margin:0; font-size:18px; font-weight:800; color:#0f172a;">📋 Grievance History for ${userEmail}</h3>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">List of all grievances registered by or associated with this user account</p>
          </div>
          <button type="button" onclick="document.getElementById('user-grievances-modal').classList.remove('active')" style="border:none; background:none; font-size:24px; cursor:pointer; color:#64748b; line-height:1;">×</button>
        </div>

        <div id="user-modal-complaints-list" style="max-height: 420px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;">
          <p style="color:#64748b; text-align:center; padding: 20px;">Fetching grievance records...</p>
        </div>

        <div style="margin-top: 20px; text-align: right; border-top: 1px solid #f1f5f9; padding-top: 14px;">
          <button class="btn btn-secondary" onclick="document.getElementById('user-grievances-modal').classList.remove('active')" style="margin:0; padding:8px 18px; border-color:#cbd5e1;">Close Window</button>
        </div>
      </div>
    `;

    modal.classList.add('active');

    const token = localStorage.getItem('prajamitra_token');
    fetch((window.API_BASE || '') + `/api/complaints/user-history?all=true`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(allComplaints => {
      const userComplaints = allComplaints.filter(c => {
        if (!c.anonymous && c.reporter && c.reporter.email) {
          return c.reporter.email.toLowerCase() === userEmail.toLowerCase();
        }
        return false;
      });

      const listEl = document.getElementById('user-modal-complaints-list');
      if (!listEl) return;
      listEl.innerHTML = '';

      if (userComplaints.length === 0) {
        listEl.innerHTML = `
          <div style="text-align:center; padding:30px; background:#f8fafc; border-radius:12px; border:1px dashed #cbd5e1;">
            <span style="font-size:28px;">📭</span>
            <h4 style="margin:8px 0 4px 0; color:#334155;">No Filed Grievances</h4>
            <p style="margin:0; font-size:12px; color:#64748b;">This user has not submitted any public grievances yet.</p>
          </div>
        `;
        return;
      }

      userComplaints.forEach(c => {
        const div = document.createElement('div');
        div.style.background = '#f8fafc';
        div.style.border = '1px solid #e2e8f0';
        div.style.borderRadius = '10px';
        div.style.padding = '14px';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.gap = '12px';

        let badgeBg = '#eff6ff', badgeColor = '#2563eb';
        if (c.status.includes('Investigation')) { badgeBg = '#fff7ed'; badgeColor = '#d97706'; }
        else if (c.status.includes('Resolved')) { badgeBg = '#f0fdf4'; badgeColor = '#16a34a'; }

        div.innerHTML = `
          <div>
            <div style="font-size:14px; font-weight:700; color:#0f172a;">${c.title}</div>
            <div style="font-size:12px; color:#64748b; margin-top:4px;">
              <span style="font-weight:700; color:#1f7a3f;">${c.id}</span> &bull; ${c.category} &bull; 📅 ${c.date}
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; font-weight:700; background:${badgeBg}; color:${badgeColor}; padding:3px 10px; border-radius:20px; white-space:nowrap;">${c.status}</span>
            <button class="btn btn-secondary" onclick="directTrack('${c.id}'); document.getElementById('user-grievances-modal').classList.remove('active');" style="padding:4px 10px; font-size:11px; margin:0; font-weight:700;">Track &rsaquo;</button>
          </div>
        `;
        listEl.appendChild(div);
      });
    })
    .catch(err => {
      const listEl = document.getElementById('user-modal-complaints-list');
      if (listEl) listEl.innerHTML = `<p style="color:#ef4444; text-align:center;">Failed to load user grievance history.</p>`;
    });
  }
};

window.Users = Users;

