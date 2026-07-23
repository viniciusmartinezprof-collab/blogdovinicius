import { useState } from "react";
import { createCourse, deleteCourse, fetchCourses, updateCourse } from "../data/portalApi.js";

const emptyCourse = {
  title: "",
  code: "",
  workload: "",
  institution: "Instituto Federal do Paraná · Campus Ivaiporã",
  teacher: "",
  description: "",
  status: "Em preparação",
};

function makeSlug(title) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function AdminCourseManager({ courses, onCoursesChanged }) {
  const [form, setForm] = useState(emptyCourse);
  const [editingCourse, setEditingCourse] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function cancelEditing() {
    setEditingCourse(null);
    setForm(emptyCourse);
    setFeedback("");
    setErrorMessage("");
  }

  async function refreshCourses() {
    onCoursesChanged(await fetchCourses());
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setFeedback("");
      setErrorMessage("");
      setIsSubmitting(true);

      const changes = {
        title: form.title.trim(),
        code: form.code.trim() || null,
        workload: form.workload.trim() || null,
        institution: form.institution.trim() || null,
        teacher: form.teacher.trim() || null,
        description: form.description.trim() || null,
        status: form.status,
      };

      if (editingCourse) {
        await updateCourse(editingCourse.id, changes);
        setFeedback("Disciplina atualizada com sucesso.");
      } else {
        const nextPosition = courses.reduce(
          (largestPosition, course) => Math.max(largestPosition, course.position),
          0,
        ) + 1;
        await createCourse({
          ...changes,
          slug: makeSlug(form.title),
          position: nextPosition,
        });
        setFeedback("Disciplina cadastrada com sucesso.");
      }

      await refreshCourses();
      setForm(emptyCourse);
      setEditingCourse(null);
    } catch (error) {
      setErrorMessage("Não foi possível salvar a disciplina. Verifique se já existe outra com o mesmo nome.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(course) {
    setEditingCourse(course);
    setForm({
      title: course.title || "",
      code: course.code || "",
      workload: course.workload || "",
      institution: course.institution || "",
      teacher: course.teacher || "",
      description: course.description || "",
      status: course.status || "Em preparação",
    });
    setFeedback("");
    setErrorMessage("");
  }

  async function handleDelete(course) {
    const confirmed = window.confirm(
      `Excluir a disciplina “${course.title}”? Todos os materiais vinculados a ela também serão excluídos.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setFeedback("");
      setErrorMessage("");
      await deleteCourse(course.id);
      await refreshCourses();

      if (editingCourse?.id === course.id) {
        cancelEditing();
      }

      setFeedback("Disciplina excluída com sucesso.");
    } catch (error) {
      setErrorMessage("Não foi possível excluir a disciplina.");
      console.error(error);
    }
  }

  return (
    <section className="admin-panel admin-course-manager">
      <div className="admin-panel-heading">
        <p className="section-kicker">Estrutura do portal</p>
        <h2>{editingCourse ? "Editar disciplina" : "Cadastrar disciplina"}</h2>
      </div>

      <form className="admin-form course-form" onSubmit={handleSubmit}>
        <label>
          Nome da disciplina
          <input value={form.title} onChange={(event) => updateField("title", event.target.value)} required />
        </label>
        <div className="admin-form-row">
          <label>
            Código
            <input value={form.code} onChange={(event) => updateField("code", event.target.value)} />
          </label>
          <label>
            Situação
            <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
              <option value="Disponível">Disponível</option>
              <option value="Em preparação">Em preparação</option>
            </select>
          </label>
        </div>
        <label>
          Carga horária ou informação complementar
          <input value={form.workload} onChange={(event) => updateField("workload", event.target.value)} />
        </label>
        <label>
          Instituição
          <input value={form.institution} onChange={(event) => updateField("institution", event.target.value)} />
        </label>
        <label>
          Docente
          <input value={form.teacher} onChange={(event) => updateField("teacher", event.target.value)} />
        </label>
        <label>
          Curso e período
          <input value={form.description} onChange={(event) => updateField("description", event.target.value)} />
        </label>
        {errorMessage ? <p className="admin-error">{errorMessage}</p> : null}
        {feedback ? <p className="admin-success">{feedback}</p> : null}
        <div className="admin-form-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : editingCourse ? "Salvar alterações" : "Salvar disciplina"}
          </button>
          {editingCourse ? <button type="button" className="admin-secondary-button" onClick={cancelEditing}>Cancelar edição</button> : null}
        </div>
      </form>

      <ul className="admin-course-list">
        {courses.map((course) => (
          <li key={course.id}>
            <div><strong>{course.title}</strong><small>{course.code || "Sem código"} · {course.status}</small></div>
            <div className="admin-list-actions">
              <button type="button" onClick={() => handleEdit(course)}>Editar</button>
              <button type="button" className="admin-delete-button" onClick={() => handleDelete(course)}>Excluir</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default AdminCourseManager;
