# Last Updated: 2026-08-05 10:22

# Sourceglass Phase 6 — デプロイ検証

## 対象デプロイ

- develop デプロイ URL: `https://develop.sourceglass.pages.dev/`
- 本番 URL 候補: `https://sourceglass.pages.dev/`
- develop の配信 JavaScript から特定した C2PA Worker: `assets/c2pa_worker-DXNlPeXm.js`

## develop HTML レスポンスの CSP

```console
$ curl -sI https://develop.sourceglass.pages.dev/ | grep -i content-security-policy
content-security-policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
```

## develop C2PA Worker レスポンスの CSP

```console
$ curl -sI https://develop.sourceglass.pages.dev/assets/c2pa_worker-DXNlPeXm.js | grep -i content-security-policy
content-security-policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
```

## 本番デプロイ前の状態

```console
$ curl -sI https://sourceglass.pages.dev/ | grep -i content-security-policy
exit status: 1
```

```console
$ curl -sI https://sourceglass.pages.dev/ | sed -n '1,8p'
HTTP/2 404
date: Wed, 05 Aug 2026 01:14:22 GMT
content-type: text/html
report-to: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=Kve5kzdyHdNFDsty8GoJXXH1ZqOH610JKlvrNPcPVcoSEzGhTO8yMBOh%2FwxeKOORslxDsqKiQ%2FPDwaYRMH9G47oEkFvC2hSW4erVGVzhbvzWf2h2l2L84UU2DpNPJlEPPrkzVnzZm%2BM%3D"}]}
nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
server: cloudflare
cf-ray: a261f1d03e0b0795-KIX
alt-svc: h3=":443"; ma=86400
```

## 本番 HTML レスポンスの CSP

```console
$ curl -sI https://sourceglass.pages.dev/ | grep -i content-security-policy
content-security-policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
```

## 本番 C2PA Worker レスポンスの CSP

本番の配信 JavaScriptから特定した Worker は `assets/c2pa_worker-DXNlPeXm.js`。

```console
$ curl -sI https://sourceglass.pages.dev/assets/c2pa_worker-DXNlPeXm.js | grep -i content-security-policy
content-security-policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
```

## 結果

develop と本番の双方で、HTML と C2PA Worker に `public/_headers` と同じ CSP が返った。`/*` が Worker にも適用されることを実測できた。本番デプロイの CSP 検証は完了。
