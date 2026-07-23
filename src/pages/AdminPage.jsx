import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminCourseManager from "../components/AdminCourseManager.jsx";
import MathRibbon from "../components/MathRibbon.jsx";
import {
  createMaterial,
  deleteMaterial,
  deleteStoredPdf,
  fetchAdminMaterials,
  fetchCourses,
  fetchMyAdminRecord,
  updateMaterial,
  uploadMaterialPdf,
} from "../data/portalApi.js";
import { supabase } from "../lib/supabase.js";
import { PortalState } from "./PublicPortal.jsx";

const emptyForm = {
  title: "",
  summary: "",
  area: "",
  note: "",
  materialUrl: "",
  status: "draft",
};

function AdminPage() {
  const [session, setSession] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(undefined);

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }

    async function checkAccess() {
      try {
        setIsAdmin(undefined);
        setIsAdmin(Boolean(await fetchMyAdminRecord()));
      } catch (error) {
        setIsAdmin(false);
        console.error(error);
      }
    }

    checkAccess();
  }, [session]);

  if (session === undefined || (session && isAdmin === undefined)) {
    return <PortalState title="Verificando acesso…" />;
  }

  if (!session) {
    return <AdminLogin />;
  }

  if (!isAdmin) {
    return <AccessDenied />;
  }

  return <AdminDashboard session={session} />;
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setErrorMessage("");
      setIsSubmitting(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }
    } catch (error) {
      setErrorMessage("Não foi possível entrar. Confira o e-mail e a senha.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="admin-login-shell">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <MathRibbon />
        <p className="eyebrow">Área restrita</p>
        <h1 id="admin-login-title">Administração do portal</h1>
        <p>Entre com a conta autorizada para cadastrar e publicar materiais.</p>

        <form onSubmit={handleSubmit} className="admin-form">
          <label>
            E-mail
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          </label>
          <label>
            Senha
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
          </label>
          {errorMessage ? <p className="admin-error">{errorMessage}</p> : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <Link to="/" className="admin-back-link">← Voltar ao portal público</Link>
      </section>
    </main>
  );
}

function AccessDenied() {
  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <main className="admin-login-shell">
      <section className="admin-login-card">
        <MathRibbon />
        <p className="eyebrow">Acesso negado</p>
        <h1>Esta conta não é administradora.</h1>
        <p>Use a conta que foi cadastrada na tabela de administradores do portal.</p>
        <button type="button" onClick={handleSignOut}>Sair desta conta</button>
      </section>
    </main>
  );
}

function AdminDashboard({ session }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [adminSection, setAdminSection] = useState("materials");

  useEffect(() => {
    async function loadCourses() {
      try {
        setCourses(await fetchCourses());
      } catch (error) {
        setErrorMessage("Não foi possível carregar as disciplinas.");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCourses();
  }, []);

  useEffect(() => {
    if (!selectedCourseId) {
      setMaterials([]);
      return;
    }

    async function loadMaterials() {
      try {
        setErrorMessage("");
        setMaterials(await fetchAdminMaterials(selectedCourseId));
      } catch (error) {
        setErrorMessage("Não foi possível carregar os materiais desta disciplina.");
        console.error(error);
      }
    }

    loadMaterials();
  }, [selectedCourseId]);

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    let uploadedPdf = null;

    if (!selectedCourseId) {
      setErrorMessage("Escolha uma disciplina antes de salvar.");
      return;
    }

    try {
      setErrorMessage("");
      setFeedback("");
      setIsSubmitting(true);

      const materialChanges = {
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        area: form.area.trim() || null,
        note: form.note.trim() || null,
        material_url: form.materialUrl.trim() || null,
        status: form.status,
        published_at: form.status === "published"
          ? editingMaterial?.published_at || new Date().toISOString()
          : null,
      };

      if (selectedFile) {
        uploadedPdf = await uploadMaterialPdf(selectedFile, selectedCourseId);
        materialChanges.material_url = uploadedPdf.publicUrl;
        materialChanges.storage_path = uploadedPdf.path;
      }

      if (editingMaterial) {
        const updatedMaterial = await updateMaterial(editingMaterial.id, materialChanges);
        setMaterials((currentMaterials) => currentMaterials.map((material) => (
          material.id === updatedMaterial.id ? updatedMaterial : material
        )));
        setFeedback("Material atualizado com sucesso.");

        if (uploadedPdf && editingMaterial.storage_path) {
          try {
            await deleteStoredPdf(editingMaterial.storage_path);
          } catch (storageError) {
            console.error(storageError);
          }
        }
      } else {
        const nextPosition = materials.reduce(
          (largestPosition, material) => Math.max(largestPosition, material.position),
          0,
        ) + 1;
        const newMaterial = await createMaterial({
          ...materialChanges,
          course_id: selectedCourseId,
          position: nextPosition,
          created_by: session.user.id,
        });
        setMaterials((currentMaterials) => [...currentMaterials, newMaterial]);
        setFeedback(form.status === "published" ? "Material publicado com sucesso." : "Rascunho salvo com sucesso.");
      }

      setForm(emptyForm);
      setEditingMaterial(null);
      setSelectedFile(null);
      setFileInputKey((currentKey) => currentKey + 1);
    } catch (error) {
      if (uploadedPdf) {
        try {
          await deleteStoredPdf(uploadedPdf.path);
        } catch (storageError) {
          console.error(storageError);
        }
      }
      setErrorMessage("Não foi possível salvar o material. Tente novamente.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  function handleEdit(material) {
    setEditingMaterial(material);
    setForm({
      title: material.title || "",
      summary: material.summary || "",
      area: material.area || "",
      note: material.note || "",
      materialUrl: material.material_url || "",
      status: material.status,
    });
    setFeedback("");
    setErrorMessage("");
    setSelectedFile(null);
    setFileInputKey((currentKey) => currentKey + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditing() {
    setEditingMaterial(null);
    setForm(emptyForm);
    setFeedback("");
    setErrorMessage("");
    setSelectedFile(null);
    setFileInputKey((currentKey) => currentKey + 1);
  }

  async function handleDelete(material) {
    const confirmed = window.confirm(`Excluir “${material.title}”? Esta ação não pode ser desfeita.`);

    if (!confirmed) {
      return;
    }

    try {
      setErrorMessage("");
      await deleteMaterial(material.id);
      try {
        await deleteStoredPdf(material.storage_path);
      } catch (storageError) {
        console.error(storageError);
      }
      setMaterials((currentMaterials) => currentMaterials.filter((item) => item.id !== material.id));

      if (editingMaterial?.id === material.id) {
        cancelEditing();
      }

      setFeedback("Material excluído com sucesso.");
    } catch (error) {
      setErrorMessage("Não foi possível excluir o material. Tente novamente.");
      console.error(error);
    }
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <MathRibbon />
        <div>
          <p className="eyebrow">Área restrita</p>
          <h1>{adminSection === "materials" ? "Administração de materiais" : "Administração de disciplinas"}</h1>
          <p>Conta ativa: {session.user.email}</p>
        </div>
        <div className="admin-header-actions">
          <Link to="/">Ver portal público</Link>
          <button type="button" onClick={handleSignOut}>Sair</button>
        </div>
      </header>

      <nav className="admin-section-nav" aria-label="Áreas de administração">
        <button
          type="button"
          className={adminSection === "materials" ? "is-active" : ""}
          onClick={() => setAdminSection("materials")}
        >
          <span>∫</span> Materiais
        </button>
        <button
          type="button"
          className={adminSection === "courses" ? "is-active" : ""}
          onClick={() => setAdminSection("courses")}
        >
          <span>Σ</span> Disciplinas
        </button>
      </nav>

      <main className="admin-content">
        {adminSection === "materials" ? (
          <>
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <p className="section-kicker">{editingMaterial ? "Edição" : "Novo conteúdo"}</p>
            <h2>{editingMaterial ? "Editar material" : "Cadastrar material"}</h2>
          </div>

          {isLoading ? <p>Carregando disciplinas…</p> : (
            <form className="admin-form material-form" onSubmit={handleSubmit}>
              <label>
                Disciplina
                <select value={selectedCourseId} onChange={(event) => { setSelectedCourseId(event.target.value); cancelEditing(); }} required>
                  <option value="">Selecione uma disciplina</option>
                  {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                </select>
              </label>
              <label>
                Título
                <input value={form.title} onChange={(event) => updateField("title", event.target.value)} required />
              </label>
              <label>
                Resumo
                <textarea value={form.summary} onChange={(event) => updateField("summary", event.target.value)} rows="3" />
              </label>
              <div className="admin-form-row">
                <label>
                  Área
                  <input value={form.area} onChange={(event) => updateField("area", event.target.value)} placeholder="Ex.: Limites" />
                </label>
                <label>
                  Situação
                  <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                    <option value="draft">Rascunho</option>
                    <option value="published">Publicado</option>
                  </select>
                </label>
              </div>
              <label>
                Observação complementar
                <textarea value={form.note} onChange={(event) => updateField("note", event.target.value)} rows="3" />
              </label>
              <label>
                Link do material
                <input type="url" value={form.materialUrl} onChange={(event) => updateField("materialUrl", event.target.value)} placeholder="https://..." />
              </label>
              <label>
                Ou envie um arquivo PDF
                <input
                  key={fileInputKey}
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                />
                <small className="admin-field-help">
                  {selectedFile
                    ? `Arquivo selecionado: ${selectedFile.name}`
                    : editingMaterial?.storage_path
                      ? "Um PDF já está hospedado. Escolha outro arquivo para substituí-lo."
                      : "O PDF enviado substituirá o link preenchido acima."}
                </small>
              </label>
              {errorMessage ? <p className="admin-error">{errorMessage}</p> : null}
              {feedback ? <p className="admin-success">{feedback}</p> : null}
              <div className="admin-form-actions">
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Salvando…" : editingMaterial ? "Salvar alterações" : "Salvar material"}
                </button>
                {editingMaterial ? <button type="button" className="admin-secondary-button" onClick={cancelEditing}>Cancelar edição</button> : null}
              </div>
            </form>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <p className="section-kicker">Visão da disciplina</p>
            <h2>Materiais cadastrados</h2>
          </div>
          {!selectedCourseId ? <p>Escolha uma disciplina para listar seus materiais.</p> : null}
          {selectedCourseId && materials.length === 0 ? <p>Nenhum material cadastrado nesta disciplina.</p> : null}
          <ul className="admin-material-list">
            {materials.map((material) => (
              <li key={material.id}>
                <span>{String(material.position).padStart(2, "0")}</span>
                <div><strong>{material.title}</strong><small>{material.area || "Sem área"}</small></div>
                <em className={material.status === "published" ? "is-published" : ""}>{material.status === "published" ? "Publicado" : "Rascunho"}</em>
                <div className="admin-list-actions">
                  <button type="button" onClick={() => handleEdit(material)}>Editar</button>
                  <button type="button" className="admin-delete-button" onClick={() => handleDelete(material)}>Excluir</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
          </>
        ) : (
        <AdminCourseManager
          courses={courses}
          onCoursesChanged={(updatedCourses) => {
            setCourses(updatedCourses);
            if (!updatedCourses.some((course) => course.id === selectedCourseId)) {
              setSelectedCourseId("");
            }
          }}
        />
        )}
      </main>
    </div>
  );
}

export default AdminPage;
