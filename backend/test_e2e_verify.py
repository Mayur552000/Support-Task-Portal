import requests

base = 'http://localhost:8000/api'

# 1. Login as admin
res = requests.post(f'{base}/auth/login', json={'username': 'admin', 'password': 'password123'})
print('Admin Login Status:', res.status_code)
assert res.status_code == 200, res.text
token = res.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# 2. Test Team Dashboard
res = requests.get(f'{base}/dashboard/team', headers=headers)
print('Team Dashboard Status:', res.status_code)
assert res.status_code == 200, res.text
team_data = res.json()
print('Team KPIs:', team_data.get('team_kpis') or team_data.get('kpis'))
print('Agent Cards Count:', len(team_data['agent_cards']))
for c in team_data['agent_cards']:
    print(f"  - {c['name']} ({c['user_id']}): Open={c['open_tickets']}, Overdue={c['overdue_tickets']}, Workload={c['workload_status']}")
print('Team Tickets Count:', len(team_data['team_tickets']))

# 3. Test Agent Workspace for Mayur (ID: mayur)
res = requests.get(f'{base}/dashboard/agents/mayur', headers=headers)
print('Agent Workspace Status:', res.status_code)
assert res.status_code == 200, res.text
agent_data = res.json()
print(f"Agent Workspace Data: {agent_data['agent']['full_name']} | Workload: {agent_data['kpis']['workload_status']} | Tickets: {len(agent_data['tickets'])} | Tasks: {len(agent_data['tasks'])} | Updates: {len(agent_data['updates'])}")

# 4. Test User Management List
res = requests.get(f'{base}/users', headers=headers)
print('Users List Status:', res.status_code)
assert res.status_code == 200, res.text
users = res.json()
print('Total Registered Users:', len(users))
for u in users:
    print(f"  - {u['user_id']} ({u['full_name']}): Role={u['role']}, Status={u['status']}, HelpdeskID={u['external_helpdesk_agent_id']}")

# 5. Test Frontend Server Reachability
fe_res = requests.get('http://localhost:5173')
print('Frontend Server Reachability Status:', fe_res.status_code)
assert fe_res.status_code == 200
print('=== ALL 5 END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY! ===')
