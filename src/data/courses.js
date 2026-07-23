import { posts as numericalCalculusPosts, publishedPostCount } from "./lessons.js";

export const courses = [
  {
    id: "calculo-numerico",
    title: "Cálculo Numérico",
    code: "20262.9.IVA1001.244.1N",
    workload: "67 horas/80 aulas",
    institution: "Instituto Federal do Paraná · Campus Ivaiporã",
    teacher: "Prof. Dr. Vinícius Machado Martinez",
    description:
      "Licenciatura em Física 2026.2",
    status: "Disponível",
    materials: numericalCalculusPosts,
    publishedMaterialCount: publishedPostCount,
  },
  {
    id: "calculo-diferencial-integral-1",
    title: "Cálculo Diferencial e Integral I",
    code: "CDI I",
    workload: "Em preparação",
    institution: "Instituto Federal do Paraná · Campus Ivaiporã",
    teacher: "",
    description:
      "Engenharia Agronômica 2026.2",
    status: "Em preparação",
    materials: [],
    publishedMaterialCount: 0,
  },
];
