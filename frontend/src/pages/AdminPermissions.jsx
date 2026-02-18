import React, { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const emptyRule = {
  code: "",
  title: "",
  description: "",
  error_message: "",
  associated_role: ""
};

const roleLabels = {
  superuser: "Суперпользователь",
  admin: "Администратор",
  manager: "Менеджер",
  guide: "Экскурсовод"
};

export default function AdminPermissions() {
  const { notify } = useToast();
  const { user } = useAuth();
  const [rules, setRules] = useState([]);
  const [users, setUsers] = useState([]);
  const [ruleForm, setRuleForm] = useState(emptyRule);
  const [savingRuleId, setSavingRuleId] = useState(null);
  const [savingUserId, setSavingUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customAssignments, setCustomAssignments] = useState({});

  const canManage = user && ["admin", "superuser"].includes(user.role);

  const loadData = () => {
    setLoading(true);
    Promise.all([apiFetch("/api/rules/"), apiFetch("/api/users/")])
      .then(([ruleData, userData]) => {
        setRules(ruleData);
        setUsers(userData);
      })
      .catch((err) =>
        notify({
          type: "error",
          title: "Не удалось загрузить права",
          message: err.message
        })
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (canManage) {
      loadData();
    }
  }, [canManage]);

  const customRules = useMemo(
    () => rules.filter((rule) => !rule.associated_role),
    [rules]
  );

  useEffect(() => {
    if (!users.length) {
      setCustomAssignments({});
      return;
    }
    const customIds = new Set(customRules.map((rule) => rule.id));
    const next = {};
    users.forEach((item) => {
      next[item.id] = (item.rule_ids || []).filter((id) => customIds.has(id));
    });
    setCustomAssignments(next);
  }, [users, customRules]);

  if (!canManage) {
    return (
      <div className="admin-page">
        <h1>Права доступа</h1>
        <p>Доступно только администраторам.</p>
      </div>
    );
  }

  const handleRuleFormChange = (event) => {
    const { name, value } = event.target;
    setRuleForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRuleCreate = async (event) => {
    event.preventDefault();
    try {
      await apiFetch("/api/rules/", {
        method: "POST",
        body: JSON.stringify({
          code: ruleForm.code.trim(),
          title: ruleForm.title.trim(),
          description: ruleForm.description.trim() || null,
          error_message: ruleForm.error_message.trim(),
          associated_role: ruleForm.associated_role || null
        })
      });
      setRuleForm(emptyRule);
      loadData();
      notify({
        type: "success",
        title: "Правило создано"
      });
    } catch (err) {
      notify({
        type: "error",
        title: "Ошибка создания правила",
        message: err.message
      });
    }
  };

  const handleRuleFieldChange = (ruleId, field, value) => {
    setRules((prev) =>
      prev.map((item) => (item.id === ruleId ? { ...item, [field]: value } : item))
    );
  };

  const handleRuleUpdate = async (ruleId) => {
    const target = rules.find((item) => item.id === ruleId);
    if (!target) return;
    setSavingRuleId(ruleId);
    try {
      const updated = await apiFetch(`/api/rules/${ruleId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: target.title.trim(),
          description: target.description?.trim() || null,
          error_message: target.error_message.trim(),
          associated_role: target.associated_role || null
        })
      });
      setRules((prev) => prev.map((item) => (item.id === ruleId ? updated : item)));
      notify({
        type: "success",
        title: "Правило обновлено"
      });
    } catch (err) {
      notify({
        type: "error",
        title: "Ошибка обновления правила",
        message: err.message
      });
    } finally {
      setSavingRuleId(null);
    }
  };

  const handleRuleDelete = async (ruleId) => {
    if (!window.confirm("Удалить правило?")) {
      return;
    }
    setSavingRuleId(ruleId);
    try {
      await apiFetch(`/api/rules/${ruleId}`, { method: "DELETE" });
      setRules((prev) => prev.filter((item) => item.id !== ruleId));
      notify({
        type: "success",
        title: "Правило удалено"
      });
    } catch (err) {
      notify({
        type: "error",
        title: "Ошибка удаления правила",
        message: err.message
      });
    } finally {
      setSavingRuleId(null);
    }
  };

  const handleCustomToggle = (userId, ruleId) => {
    setCustomAssignments((prev) => {
      const current = new Set(prev[userId] || []);
      if (current.has(ruleId)) {
        current.delete(ruleId);
      } else {
        current.add(ruleId);
      }
      return { ...prev, [userId]: Array.from(current) };
    });
  };

  const handleSaveCustomRules = async (userId) => {
    setSavingUserId(userId);
    try {
      const updated = await apiFetch(`/api/users/${userId}/rules`, {
        method: "PUT",
        body: JSON.stringify({
          rule_ids: customAssignments[userId] || []
        })
      });
      setUsers((prev) => prev.map((item) => (item.id === userId ? updated : item)));
      notify({
        type: "success",
        title: "Права обновлены"
      });
    } catch (err) {
      notify({
        type: "error",
        title: "Ошибка обновления прав",
        message: err.message
      });
    } finally {
      setSavingUserId(null);
    }
  };

  const roleRuleLabels = (role) => {
    if (role === "superuser") {
      return ["Все права"];
    }
    const inheritedRoles = role === "admin" ? ["admin", "manager"] : [role];
    return rules
      .filter((rule) => rule.associated_role && inheritedRoles.includes(rule.associated_role))
      .map((rule) => rule.title);
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Права доступа</h1>
          <p>Настройте правила и выдайте дополнительные права сотрудникам.</p>
        </div>
        <div className="admin-header-actions">
          <button className="button ghost" type="button" onClick={loadData}>
            Обновить
          </button>
        </div>
      </div>

      <div className="admin-card">
        <h3>Добавить правило</h3>
        <form className="form-grid" onSubmit={handleRuleCreate}>
          <label>
            Код
            <input name="code" value={ruleForm.code} onChange={handleRuleFormChange} required />
          </label>
          <label>
            Название
            <input name="title" value={ruleForm.title} onChange={handleRuleFormChange} required />
          </label>
          <label>
            Роль по умолчанию
            <select
              name="associated_role"
              value={ruleForm.associated_role}
              onChange={handleRuleFormChange}
            >
              <option value="">Без роли</option>
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Описание
            <textarea
              name="description"
              rows="3"
              value={ruleForm.description}
              onChange={handleRuleFormChange}
            />
          </label>
          <label className="full">
            Сообщение об ошибке
            <input
              name="error_message"
              value={ruleForm.error_message}
              onChange={handleRuleFormChange}
              required
            />
          </label>
          <button className="button primary" type="submit">
            Создать
          </button>
        </form>
      </div>

      {loading && <p>Загрузка...</p>}

      <div className="permission-grid">
        {rules.map((rule) => (
          <div key={rule.id} className="admin-card permission-card">
            <div className="permission-card-header">
              <div>
                <strong>{rule.title}</strong>
                <span className="permission-code">{rule.code}</span>
              </div>
              <span className="permission-role">
                {rule.associated_role ? roleLabels[rule.associated_role] : "Без роли"}
              </span>
            </div>
            <label>
              Название
              <input
                value={rule.title}
                onChange={(event) => handleRuleFieldChange(rule.id, "title", event.target.value)}
              />
            </label>
            <label>
              Роль
              <select
                value={rule.associated_role || ""}
                onChange={(event) => handleRuleFieldChange(rule.id, "associated_role", event.target.value)}
              >
                <option value="">Без роли</option>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="full">
              Описание
              <textarea
                rows="3"
                value={rule.description || ""}
                onChange={(event) => handleRuleFieldChange(rule.id, "description", event.target.value)}
              />
            </label>
            <label className="full">
              Сообщение об ошибке
              <input
                value={rule.error_message}
                onChange={(event) => handleRuleFieldChange(rule.id, "error_message", event.target.value)}
              />
            </label>
            <div className="admin-card-actions">
              <button
                className="button primary"
                type="button"
                onClick={() => handleRuleUpdate(rule.id)}
                disabled={savingRuleId === rule.id}
              >
                {savingRuleId === rule.id ? "Сохранение..." : "Сохранить"}
              </button>
              <button
                className="button ghost"
                type="button"
                onClick={() => handleRuleDelete(rule.id)}
                disabled={savingRuleId === rule.id}
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>

      <section className="editor-section">
        <h3>Права пользователей</h3>
        {users.length === 0 && !loading && <p>Пользователей пока нет.</p>}
        {customRules.length === 0 && (
          <p>
            Нет правил без роли. Добавьте правило с "Без роли", чтобы выдавать
            индивидуальные права.
          </p>
        )}
        <div className="permission-users">
          {users.map((member) => (
            <div key={member.id} className="permission-user-card">
              <div className="permission-user-header">
                <div>
                  <strong>{member.full_name}</strong>
                  <span>{member.email}</span>
                  <span className="permission-user-role">{roleLabels[member.role] || member.role}</span>
                </div>
                <button
                  className="button primary"
                  type="button"
                  onClick={() => handleSaveCustomRules(member.id)}
                  disabled={savingUserId === member.id}
                >
                  {savingUserId === member.id ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
              <div className="permission-user-section">
                <span className="permission-section-title">Права по роли</span>
                <div className="permission-tags">
                  {roleRuleLabels(member.role).map((label) => (
                    <span key={label} className="permission-tag">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              {customRules.length > 0 && (
                <div className="permission-user-section">
                  <span className="permission-section-title">Дополнительные права</span>
                  <div className="permission-custom">
                    {customRules.map((rule) => (
                      <label key={rule.id} className="permission-custom-item">
                        <input
                          type="checkbox"
                          checked={(customAssignments[member.id] || []).includes(rule.id)}
                          onChange={() => handleCustomToggle(member.id, rule.id)}
                        />
                        <span>{rule.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
