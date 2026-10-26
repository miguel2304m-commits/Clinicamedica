import { chromium } from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR',timezoneId:'America/Sao_Paulo'});
  const page=await context.newPage();
  async function login(conta){await page.goto('http://127.0.0.1:3002');await page.getByLabel('E-mail',{exact:true}).fill(conta+'@clinica.local');await page.getByLabel('Senha',{exact:true}).fill('Clinica@2026');await page.getByRole('button',{name:'Entrar na plataforma'}).click();await page.getByRole('heading',{name:'Visão geral',exact:true}).waitFor();}
  async function capturar(nome){await page.locator('.toast').waitFor({state:'hidden'});await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'docs/evidencias/'+nome+'.png',fullPage:true});}
  await login('admin');await capturar('dashboard');
  await page.locator('nav').getByRole('button',{name:'Agenda',exact:true}).click();await page.getByRole('button',{name:'Semana',exact:true}).click();await page.locator('.week-day').first().waitFor();await capturar('agenda');
  await page.locator('nav').getByRole('button',{name:'Relatórios',exact:true}).click();await page.getByText('Faturamento por médico',{exact:true}).waitFor();await capturar('relatorios');
  await page.getByRole('button',{name:'Sair da conta'}).click();await login('medico');
  await page.locator('nav').getByRole('button',{name:'Pacientes',exact:true}).click();await page.getByPlaceholder('Pesquisar por nome ou CPF…').fill('Ana Clara');await page.getByRole('button',{name:'Ver paciente'}).first().click();await page.getByRole('button',{name:'Prescrições',exact:true}).click();await page.locator('.prescription').first().waitFor();await capturar('prontuario');
  await page.locator('nav').getByRole('button',{name:'Visão geral',exact:true}).click();await page.getByRole('heading',{name:'Visão geral',exact:true}).waitFor();await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=0);await capturar('mobile');
  console.log('Cinco capturas finais atualizadas.');
} finally {await browser.close();}
