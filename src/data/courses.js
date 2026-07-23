import { posts as numericalCalculusPosts, publishedPostCount } from "./lessons.js";

export const courses = [
  {
    id: "calculo-numerico",
    title: "Cálculo Numérico",
    code: "MAT-067",
    workload: "67 horas",
    institution: "Instituto Federal do Paraná · Campus Ivaiporã",
    teacher: "Prof. Vinícius Machado Martinez",
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
    teacher: "Prof. Vinícius Machado Martinez",
    description:
      "Engenharia Agronômica 2026.2",
    status: "Em preparação",
    materials: [],
    publishedMaterialCount: 0,
  },
];
