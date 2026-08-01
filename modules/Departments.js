// Departments.js - Manages departments table listings, search, pagination, and edits
const Departments = {
  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a;">Departments</h2>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">View and manage all departments</p>
        </div>
        <button class="btn btn-primary" onclick="switchAuthSubTab('add-dept')" style="margin: 0; background: #16a34a; border-color: #16a34a; display: flex; align-items: center; gap: 8px; font-weight: 700; border-radius: 8px; padding: 10px 18px;">
          + Add Department
        </button>
      </div>

      <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(15,23,42,0.02);">
        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
          <div style="position: relative;">
            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 14px;">🔍</span>
            <input type="text" id="dept-search-input" placeholder="Search department..." style="padding: 9px 14px 9px 34px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; width: 240px; font-family: inherit;">
          </div>
        </div>
        <div style="overflow-x: auto;">
          <table class="admin-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
                <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">#</th>
                <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Department Name</th>
                <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Type</th>
                <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Contact Email</th>
                <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Status</th>
                <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Actions</th>
              </tr>
            </thead>
            <tbody id="departments-table-body"></tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #64748b;">
          <div id="departments-page-info">Showing 1 to 5 of 12 departments</div>
          <div style="display: flex; gap: 6px;">
            <button style="padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: pointer; color: #475569; font-weight: 600;">&lt;</button>
            <button style="padding: 6px 12px; border: 1px solid #16a34a; border-radius: 6px; background: #16a34a; cursor: pointer; color: #fff; font-weight: 700;">1</button>
            <button style="padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: pointer; color: #475569; font-weight: 600;">2</button>
            <button style="padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: pointer; color: #475569; font-weight: 600;">3</button>
            <button style="padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: pointer; color: #475569; font-weight: 600;">&gt;</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('dept-search-input').addEventListener('input', (e) => {
      filterDepartmentsTable(e.target.value);
    });

    this.loadData();
  },

  loadData() {
    loadDepartmentsTable();
  }
};

window.Departments = Departments;
