import type { MockSutScenario } from "./types";

function scenarioMarkup(scenario: MockSutScenario) {
  const imageSize = scenario === "low" ? "64" : scenario === "medium" ? "320" : "900";
  const scriptCount = scenario === "low" ? 1 : scenario === "medium" ? 2 : 4;
  const scripts = Array.from(
    { length: scriptCount },
    (_, index) => `<script>window.mockSignal${index} = '${scenario}';</script>`,
  ).join("");
  return `<!doctype html>
    <html><head><meta charset="utf-8"><title>AdaptLab Development Mock SUT</title>
    <style>body{font-family:system-ui;margin:0;padding:48px;background:#f5faf9;color:#173041}
    main{max-width:760px;margin:auto;background:white;border:1px solid #dce6e8;padding:32px}
    img{display:block;width:100%;max-width:640px;height:220px;object-fit:cover;background:#d8ece8}</style></head>
    <body><main data-mock-sut="true" data-scenario="${scenario}">
    <p><strong>DEVELOPMENT / MOCK SUT</strong></p><h1>Adaptive ${scenario} experience</h1>
    <p>This page is generated only for Phase 3 development and is not a real customer SUT.</p>
    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${imageSize}' height='${imageSize}'%3E%3Crect width='100%25' height='100%25' fill='%2326ab96'/%3E%3C/svg%3E" alt="Mock signal">
    ${scripts}</main></body></html>`;
}

export function mockSutHtml(scenario: MockSutScenario) {
  return scenarioMarkup(scenario);
}