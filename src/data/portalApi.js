import { supabase } from "../lib/supabase.js";

export async function fetchCourses() {
  const { data, error } = await supabase
    .from("courses")
    .select("id, slug, title, code, workload, institution, teacher, description, status, position")
    .order("position", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchPublishedMaterials(courseId) {
  const { data, error } = await supabase
    .from("materials")
    .select("id, title, summary, area, note, material_url, storage_path, status, position, published_at")
    .eq("course_id", courseId)
    .eq("status", "published")
    .order("position", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchAdminMaterials(courseId) {
  const { data, error } = await supabase
    .from("materials")
    .select("id, title, summary, area, note, material_url, storage_path, status, position, published_at")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchMyAdminRecord() {
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id, role")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createMaterial(material) {
  const { data, error } = await supabase
    .from("materials")
    .insert(material)
    .select("id, title, summary, area, note, material_url, storage_path, status, position, published_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateMaterial(materialId, changes) {
  const { data, error } = await supabase
    .from("materials")
    .update(changes)
    .eq("id", materialId)
    .select("id, title, summary, area, note, material_url, storage_path, status, position, published_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteMaterial(materialId) {
  const { error } = await supabase.from("materials").delete().eq("id", materialId);

  if (error) {
    throw error;
  }
}

export async function uploadMaterialPdf(file, courseId) {
  if (file.type !== "application/pdf") {
    throw new Error("Selecione um arquivo PDF.");
  }

  const safeName = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-");
  const path = `${courseId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage
    .from("course-materials")
    .upload(path, file, { contentType: "application/pdf", upsert: false });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("course-materials").getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function deleteStoredPdf(path) {
  if (!path) {
    return;
  }

  const { error } = await supabase.storage.from("course-materials").remove([path]);

  if (error) {
    throw error;
  }
}

export async function createCourse(course) {
  const { data, error } = await supabase
    .from("courses")
    .insert(course)
    .select("id, slug, title, code, workload, institution, teacher, description, status, position")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCourse(courseId, changes) {
  const { data, error } = await supabase
    .from("courses")
    .update(changes)
    .eq("id", courseId)
    .select("id, slug, title, code, workload, institution, teacher, description, status, position")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteCourse(courseId) {
  const { error } = await supabase.from("courses").delete().eq("id", courseId);

  if (error) {
    throw error;
  }
}
