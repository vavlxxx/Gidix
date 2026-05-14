import React from "react";
import { KeyRound, Plus, Save, Search } from "lucide-react";
import { usersApi } from "../../api/client";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { Drawer } from "../../components/ui/Drawer";
import { FormField } from "../../components/ui/FormField";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState, LoadingState } from "../../components/ui/State";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { roleTitle, userHasRole } from "../../utils/format";

const emptyUser = {
  email: "",
  username: "",
  first_name: "",
  last_name: "",
  middle_name: "",
  full_name: "",
  phone: "",
  active: true,
  roles: ["client"],
  password: ""
};

export function UsersPage() {
  const auth = useAuth();
  const notify = useToast();
  const canEdit = userHasRole(auth.user, ["admin", "superuser"]);
  const [users, setUsers] = React.useState([]);
  const [roles, setRoles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState(null);
  const [filters, setFilters] = React.useState({ q: "", role: "all" });

  const rows = users.filter((user) => {
    const text = [user.full_name, user.email, user.phone, user.username].filter(Boolean).join(" ").toLowerCase();
    return text.includes(filters.q.toLowerCase()) && (filters.role === "all" || user.roles?.includes(filters.role));
  });

  async function load() {
    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([usersApi.list(), usersApi.roles()]);
      setUsers(usersData || []);
      setRoles(rolesData || []);
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  function openUser(user = null) {
    setSelected(user ? { ...emptyUser, ...user, password: "" } : { ...emptyUser });
  }

  function toggleRole(role) {
    const current = new Set(selected.roles || []);
    if (current.has(role)) current.delete(role);
    else current.add(role);
    setSelected({ ...selected, roles: [...current] });
  }

  async function save(event) {
    event.preventDefault();
    if (!canEdit) return;
    try {
      const payload = {
        email: selected.email,
        username: selected.username || null,
        first_name: selected.first_name || "",
        last_name: selected.last_name || "",
        middle_name: selected.middle_name || null,
        full_name: selected.full_name || "",
        phone: selected.phone || null,
        active: Boolean(selected.active)
      };
      if (selected.id) {
        await usersApi.update(selected.id, payload);
        await usersApi.updateRoles(selected.id, selected.roles);
        if (selected.password) await usersApi.updatePassword(selected.id, selected.password);
        notify.success("Пользователь обновлён.");
      } else {
        await usersApi.create({ ...payload, password: selected.password, roles: selected.roles });
        notify.success("Пользователь создан.");
      }
      setSelected(null);
      load();
    } catch (err) {
      notify.error(err.message);
    }
  }

  const columns = [
    { key: "name", title: "Пользователь", render: (row) => <button type="button" className="table-link" onClick={() => openUser(row)}>{row.full_name || row.email}</button> },
    { key: "contacts", title: "Контакты", render: (row) => <><strong>{row.email}</strong><br /><span className="muted-text">{row.phone || row.username || "—"}</span></> },
    { key: "roles", title: "Роли", render: (row) => <div className="role-badges">{(row.roles || []).map((role) => <Badge key={role}>{roleTitle(role)}</Badge>)}</div> },
    { key: "active", title: "Доступ", render: (row) => row.active ? <Badge tone="success">Активен</Badge> : <Badge tone="danger">Отключён</Badge> }
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Администрирование"
        title="Пользователи и роли"
        description="Создание сотрудников, отключение доступа и назначение ролей для рабочих разделов системы."
        actions={canEdit && <Button type="button" tone="primary" onClick={() => openUser()}><Plus size={17} /> Новый пользователь</Button>}
      />
      <section className="filters-panel">
        <label className="search-field"><Search size={17} /><input placeholder="ФИО, email или телефон" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} /></label>
        <select value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value })} aria-label="Роль">
          <option value="all">Все роли</option>
          {roles.map((role) => <option key={role.name} value={role.name}>{roleTitle(role.name)}</option>)}
        </select>
      </section>
      {loading && <LoadingState text="Загрузка пользователей" />}
      {!loading && !rows.length && <EmptyState title="Пользователи не найдены" text="Измените фильтры или создайте нового пользователя." />}
      {!!rows.length && <DataTable columns={columns} rows={rows} />}
      <Drawer title={selected?.id ? "Редактирование пользователя" : "Новый пользователь"} onClose={() => setSelected(null)}>
        {selected && (
          <form className="stack" onSubmit={save}>
            {!canEdit && <p className="panel-hint">Режим просмотра: изменение пользователей доступно администратору и суперпользователю.</p>}
            <FormField label="Email" required><input type="email" value={selected.email} disabled={!canEdit} onChange={(event) => setSelected({ ...selected, email: event.target.value })} required /></FormField>
            <FormField label="Username"><input value={selected.username || ""} disabled={!canEdit} onChange={(event) => setSelected({ ...selected, username: event.target.value })} /></FormField>
            <FormField label="ФИО"><input value={selected.full_name || ""} disabled={!canEdit} onChange={(event) => setSelected({ ...selected, full_name: event.target.value })} /></FormField>
            <div className="form-grid">
              <FormField label="Имя"><input value={selected.first_name || ""} disabled={!canEdit} onChange={(event) => setSelected({ ...selected, first_name: event.target.value })} /></FormField>
              <FormField label="Фамилия"><input value={selected.last_name || ""} disabled={!canEdit} onChange={(event) => setSelected({ ...selected, last_name: event.target.value })} /></FormField>
            </div>
            <FormField label="Телефон"><input value={selected.phone || ""} disabled={!canEdit} onChange={(event) => setSelected({ ...selected, phone: event.target.value })} /></FormField>
            <label className="switch-line"><input type="checkbox" checked={selected.active} disabled={!canEdit} onChange={(event) => setSelected({ ...selected, active: event.target.checked })} /> <span>Активный пользователь</span></label>
            <div className="roles-checklist">
              {roles.map((role) => (
                <label key={role.name}>
                  <input type="checkbox" checked={selected.roles?.includes(role.name)} disabled={!canEdit} onChange={() => toggleRole(role.name)} />
                  <span>{roleTitle(role.name)}</span>
                </label>
              ))}
            </div>
            {canEdit && <FormField label={selected.id ? "Новый пароль" : "Пароль"} required={!selected.id}><input type="password" minLength="8" value={selected.password} onChange={(event) => setSelected({ ...selected, password: event.target.value })} required={!selected.id} /></FormField>}
            {canEdit && <div className="drawer-actions"><Button type="submit" tone="primary"><Save size={17} /> Сохранить</Button>{selected.id && <Button type="button" tone="neutral" onClick={() => setSelected({ ...selected, password: "password123" })}><KeyRound size={17} /> Сбросить пароль</Button>}</div>}
          </form>
        )}
      </Drawer>
    </div>
  );
}
