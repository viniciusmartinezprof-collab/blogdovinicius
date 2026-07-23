-- Migração dos materiais existentes de Cálculo Numérico.
-- Execute uma única vez no SQL Editor do Supabase.

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Sistemas de Numeração',
  'Bases numéricas, conversões e representação de valores.',
  'Fundamentos',
  'Revisão conceitual para preparar os próximos módulos.',
  'https://drive.google.com/file/d/1CRWxfriDdyoKLAhEJKBeUweMmberN5lc/view?usp=sharing',
  'published',
  1,
  now()
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Aritmética de Ponto Flutuante',
  'Representação computacional de números reais e suas limitações.',
  'Fundamentos',
  'Importante para entender o comportamento numérico dos algoritmos.',
  null,
  'published',
  2,
  now()
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Erros e operações na aritmética de ponto flutuante',
  'Erros de arredondamento, truncamento e propagação numérica.',
  'Fundamentos',
  'Base para analisar estabilidade e confiabilidade dos métodos.',
  null,
  'published',
  3,
  now()
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Isolando zeros de funções',
  'Estratégias iniciais para localizar raízes em intervalos.',
  'Zeros de Funções',
  'Introduz a ideia de preparar o terreno para métodos iterativos.',
  null,
  'draft',
  4,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Método da Bisseção',
  'Método iterativo com garantia de convergência em intervalo válido.',
  'Zeros de Funções',
  'Excelente primeiro método para estudo por ser simples e robusto.',
  null,
  'draft',
  5,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Método da Falsa Posição',
  'Aproximação de raízes usando interpolação linear no intervalo.',
  'Zeros de Funções',
  'Bom para comparar com a bisseção em desempenho e comportamento.',
  null,
  'draft',
  6,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Métodos de Ponto Fixo',
  'Reescrita de equações e análise de convergência iterativa.',
  'Zeros de Funções',
  'Momento ideal para destacar critério de convergência e escolha de g(x).',
  null,
  'draft',
  7,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Método de Newton-Raphson',
  'Método clássico usando derivada para aproximar raízes.',
  'Zeros de Funções',
  'Vale reforçar o impacto da escolha do chute inicial.',
  null,
  'draft',
  8,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Método das Secantes',
  'Método semelhante ao Newton sem exigir derivada explícita.',
  'Zeros de Funções',
  'Boa oportunidade para comparar custo computacional e convergência.',
  null,
  'draft',
  9,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Eliminação Gaussiana',
  'Resolução de sistemas lineares por eliminação progressiva.',
  'Sistemas Lineares',
  'Módulo central para a transição entre teoria e implementação matricial.',
  null,
  'draft',
  10,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Fatoração LU - Parte 1',
  'Ideia geral da decomposição LU e sua utilidade.',
  'Sistemas Lineares',
  'Introduz a vantagem de reaproveitar fatorações.',
  null,
  'draft',
  11,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Fatoração LU - Exemplos',
  'Aplicações práticas da decomposição LU em sistemas lineares.',
  'Sistemas Lineares',
  'Boa aula para consolidar a mecânica do processo.',
  null,
  'draft',
  12,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Fatoração LU com pivotamento parcial',
  'Estabilidade numérica e melhoria da fatoração LU.',
  'Sistemas Lineares',
  'Importante para discutir erros numéricos em operações matriciais.',
  null,
  'draft',
  13,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Fatoração PA = LU',
  'Forma matricial com permutação para lidar com pivotamento.',
  'Sistemas Lineares',
  'Ajuda o aluno a conectar algoritmo com notação matricial formal.',
  null,
  'draft',
  14,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Fatoração de Cholesky',
  'Decomposição eficiente para matrizes simétricas positivas definidas.',
  'Sistemas Lineares',
  'Bom ponto para destacar condições especiais de aplicação.',
  null,
  'draft',
  15,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Método de Gauss-Jacobi',
  'Método iterativo para sistemas lineares.',
  'Sistemas Lineares',
  'Ideal para introduzir comparações entre métodos diretos e iterativos.',
  null,
  'draft',
  16,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Método de Gauss-Jacobi - Exercícios',
  'Aplicações e consolidação do método de Gauss-Jacobi.',
  'Sistemas Lineares',
  'Espaço para explorar a interpretação dos passos iterativos.',
  null,
  'draft',
  17,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Método de Gauss-Seidel',
  'Método iterativo com atualização imediata dos valores.',
  'Sistemas Lineares',
  'Comparação natural com Jacobi em velocidade de convergência.',
  null,
  'draft',
  18,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Introdução a Sistemas Não Lineares',
  'Primeiros conceitos sobre resolução numérica de sistemas não lineares.',
  'Sistemas Não Lineares',
  'Módulo de transição para problemas multivariados.',
  null,
  'draft',
  19,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Método de Newton Modificado',
  'Extensão do método de Newton para novos contextos.',
  'Sistemas Não Lineares',
  'Boa aula para enfatizar derivadas, jacobiano e custo computacional.',
  null,
  'draft',
  20,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Interpolação Polinomial - Introdução',
  'Motivação e ideia geral de aproximar dados por polinômios.',
  'Interpolação',
  'Abre o bloco de aproximação de funções.',
  null,
  'draft',
  21,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Polinômio Interpolador de Lagrange',
  'Construção explícita do polinômio usando bases de Lagrange.',
  'Interpolação',
  'Bom para destacar fórmula fechada e interpretação geométrica.',
  null,
  'draft',
  22,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Operador de diferenças divididas',
  'Ferramenta para montar a interpolação de forma incremental.',
  'Interpolação',
  'Prepara o caminho para o polinômio de Newton.',
  null,
  'draft',
  23,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Polinômio Interpolador de Newton',
  'Forma incremental e eficiente do polinômio interpolador.',
  'Interpolação',
  'Importante para comparação com Lagrange em praticidade computacional.',
  null,
  'draft',
  24,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Interpolação inversa',
  'Estimativa da entrada a partir de valores da saída.',
  'Interpolação',
  'Boa oportunidade para mostrar aplicações menos usuais da interpolação.',
  null,
  'draft',
  25,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Método dos Mínimos Quadrados - Introdução',
  'Ideia geral do ajuste de curvas por erro mínimo.',
  'Ajuste de Curvas',
  'Conecta aproximação numérica com dados experimentais.',
  null,
  'draft',
  26,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Método dos Mínimos Quadrados - Parte 2',
  'Aprofundamento da formulação e resolução do ajuste.',
  'Ajuste de Curvas',
  'Bom ponto para trabalhar a interpretação matricial do problema.',
  null,
  'draft',
  27,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Método dos Mínimos Quadrados - Caso não linear',
  'Extensão do ajuste para modelos não lineares.',
  'Ajuste de Curvas',
  'Permite discutir iteração e sensibilidade dos parâmetros.',
  null,
  'draft',
  28,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Regra dos Trapézios',
  'Aproximação numérica de integrais por somas trapezoidais.',
  'Integração Numérica',
  'Primeiro método de quadratura do bloco de integração.',
  null,
  'draft',
  29,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Regra de Simpson',
  'Quadratura numérica usando aproximação parabólica.',
  'Integração Numérica',
  'Bom para comparar a ordem de erro com a regra dos trapézios.',
  null,
  'draft',
  30,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Regra de Simpson - Exemplos',
  'Aplicações práticas da regra de Simpson.',
  'Integração Numérica',
  'Módulo de consolidação com exercícios e comparações.',
  null,
  'draft',
  31,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Regra 3/8 de Simpson',
  'Variante da quadratura de Simpson para novos particionamentos.',
  'Integração Numérica',
  'Interessante para discutir quando usar cada variante.',
  null,
  'draft',
  32,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Regra 3/8 de Simpson - Exemplos',
  'Exercícios e exemplos da regra 3/8.',
  'Integração Numérica',
  'Serve para consolidar o procedimento e suas limitações.',
  null,
  'draft',
  33,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Quadratura Gaussiana',
  'Método de integração numérica com alto ganho de eficiência.',
  'Integração Numérica',
  'Ponto alto do bloco por sofisticação e desempenho.',
  null,
  'draft',
  34,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Problemas de Valor Inicial - Método de Euler',
  'Primeiro método numérico para EDOs com valor inicial.',
  'Equações Diferenciais',
  'Importante para introduzir discretização temporal.',
  null,
  'draft',
  35,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Problemas de Valor Inicial - Métodos de Série de Taylor',
  'Aproximações locais por expansão em série.',
  'Equações Diferenciais',
  'Bom para ligar teoria analítica com construção numérica.',
  null,
  'draft',
  36,
  null
from public.courses where slug = 'calculo-numerico';

insert into public.materials (
  course_id, title, summary, area, note, material_url, status, position, published_at
)
select
  id,
  'Problemas de Valor Inicial - Métodos de Runge-Kutta',
  'Família de métodos numéricos de alta relevância para EDOs.',
  'Equações Diferenciais',
  'Encerramento forte do curso com método amplamente utilizado.',
  null,
  'draft',
  37,
  null
from public.courses where slug = 'calculo-numerico';

