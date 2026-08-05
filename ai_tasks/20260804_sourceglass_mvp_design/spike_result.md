# Last Updated: 2026-08-04 23:39

# Sourceglass Phase 0 — C2PA 技術検証スパイク結果

## 実行環境と入力

```text
branch: feature/phase0-c2pa-spike
node: v24.13.0
npm: 11.6.2
vite: 7.3.6
@contentauth/c2pa-web: 0.13.1
@contentauth/c2pa-types: 0.7.2
@contentauth/c2pa-wasm: 0.11.0
browser: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36
crossOriginIsolated: false
URL: http://localhost:4173/
```

Windows Chrome 起動スクリプトは次の実ログで失敗したため、このスパイクでは同じマシン上の
Linux Chrome 144 headless を CDP ポート `127.0.0.1:9222` で使用した。

```text
/home/sho16/.codex/scripts/browser/open-codex-browser.sh: line 15: /mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe: cannot execute binary file: Exec format error
```

使用した C2PA 公式 public test files（原本を変更せず `spike/public/fixtures/` に配置）:

```text
f999fd78bfe8a83c96e468a078830ba94485bc1bc6fd086fb94a43bd29dd0f23  adobe-20220124-A.jpg
cafc48c53e651f7ba4622d1f72783827074211e42b9634cc863ec3be3c7651b3  adobe-20220124-CA.jpg
c8bf0278bd0f92e2dfe2576a22b23b9189f3688f08c1d518b80436ae631d7d68  adobe-20220124-CAIAIIICAICIICAIICICA.jpg
56014faf6b97532252c9bb90dcf484923a8aa7bba197e84a8555044a35e4f3a6  adobe-20220124-E-uri-CA.jpg
7990a118192447f7a26c07d77693f745260074fd2346fcf5fdfe8806742ad64b  adobe-20240110-single_manifest_store.pdf
```

出典: <https://spec.c2pa.org/public-testfiles/>（CC BY-SA 4.0）

## 1. `?url` import した WASM のリクエスト

Chrome CDP の `Network.requestWillBeSent` で、キャッシュを無効化してページ再読み込みから
全測定完了まで採取した全文:

```json
[
  { "url": "http://localhost:4173/", "method": "GET", "type": "Document" },
  { "url": "http://localhost:4173/@vite/client", "method": "GET", "type": "Script" },
  { "url": "http://localhost:4173/src/main.ts?t=1785854272360", "method": "GET", "type": "Script" },
  { "url": "http://localhost:4173/node_modules/.vite/deps/@contentauth_c2pa-web.js?v=55046b00", "method": "GET", "type": "Script" },
  { "url": "http://localhost:4173/node_modules/@contentauth/c2pa-web/dist/c2pa_worker.js?url", "method": "GET", "type": "Script" },
  { "url": "http://localhost:4173/node_modules/@contentauth/c2pa-web/dist/resources/c2pa_bg.wasm?import&url", "method": "GET", "type": "Script" },
  { "url": "http://localhost:4173/node_modules/vite/dist/client/env.mjs", "method": "GET", "type": "Script" },
  { "url": "http://localhost:4173/favicon.ico", "method": "GET", "type": "Other" },
  { "url": "http://localhost:4173/node_modules/@contentauth/c2pa-web/dist/resources/c2pa_bg.wasm", "method": "GET", "type": "Fetch" },
  { "url": "blob:http://localhost:4173/69153f38-a3ce-4e76-be12-483244ceb41e", "method": "GET", "type": "Script" },
  { "url": "http://localhost:4173/fixtures/adobe-20220124-CA.jpg", "method": "GET", "type": "Fetch" },
  { "url": "http://localhost:4173/fixtures/adobe-20220124-A.jpg", "method": "GET", "type": "Fetch" },
  { "url": "http://localhost:4173/fixtures/adobe-20220124-CAIAIIICAICIICAIICICA.jpg", "method": "GET", "type": "Fetch" },
  { "url": "http://localhost:4173/fixtures/adobe-20220124-E-uri-CA.jpg", "method": "GET", "type": "Fetch" },
  { "url": "http://localhost:4173/fixtures/adobe-20240110-single_manifest_store.pdf", "method": "GET", "type": "Fetch" }
]
```

WASM 本体は `http://localhost:4173/node_modules/@contentauth/c2pa-web/dist/resources/c2pa_bg.wasm`
から取得された。外部オリジンへのリクエストは 0 件。Blob Worker の URL は
`blob:http://localhost:4173/...` で、origin は `http://localhost:4173`。

追加で判明した制約の実ログ:

```text
Error: Worker source URL must use https, but got http:
```

`createC2pa({ workerSrc: new URL(sameOriginHttpUrl) })` は localhost でも拒否された。
HTTP 開発時はパッケージ既定の Blob Worker、HTTPS 配信時は同一オリジンの `workerSrc` を使う必要がある。

## 2. `fromBlob()` → `manifestStore()` の実 JSON 全文

入力: `adobe-20220124-CA.jpg`（178709 bytes）

```json
{
  "active_manifest": "contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b",
  "manifests": {
    "contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b": {
      "claim_generator": "make_test_images/0.16.1 c2pa-rs/0.16.1",
      "title": "CA.jpg",
      "format": "image/jpeg",
      "instance_id": "xmp:iid:c39510ae-26d2-469c-8a59-3e57aa87cb8b",
      "thumbnail": {
        "format": "image/jpeg",
        "identifier": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.assertions/c2pa.thumbnail.claim.jpeg"
      },
      "ingredients": [
        {
          "title": "A.jpg",
          "format": "image/jpeg",
          "document_id": "xmp.did:813ee422-9736-4cdc-9be6-4e35ed8e41cb",
          "instance_id": "xmp.iid:813ee422-9736-4cdc-9be6-4e35ed8e41cb",
          "thumbnail": {
            "format": "image/jpeg",
            "identifier": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.assertions/c2pa.thumbnail.ingredient.jpeg"
          },
          "relationship": "parentOf",
          "label": "c2pa.ingredient"
        }
      ],
      "assertions": [
        {
          "label": "stds.schema-org.CreativeWork",
          "data": {
            "@context": "http://schema.org/",
            "@type": "CreativeWork",
            "author": [
              { "@type": "Person", "name": "Adobe make_test" }
            ]
          },
          "kind": "Json"
        },
        {
          "label": "c2pa.actions.v2",
          "data": {
            "actions": [
              {
                "action": "c2pa.opened",
                "parameters": {
                  "ingredient": {
                    "url": "self#jumbf=c2pa.assertions/c2pa.ingredient",
                    "hash": [181, 48, 67, 227, 241, 52, 71, 64, 35, 45, 71, 73, 22, 155, 21, 207, 121, 68, 252, 162, 84, 171, 109, 149, 207, 69, 6, 171, 56, 68, 165, 91]
                  }
                }
              },
              {
                "action": "c2pa.color_adjustments",
                "parameters": { "name": "brightnesscontrast" }
              }
            ]
          }
        }
      ],
      "signature_info": {
        "alg": "Ps256",
        "issuer": "C2PA Test Signing Cert",
        "common_name": "C2PA Signer",
        "cert_serial_number": "720724073027128164015125666832722375746636448153",
        "time": "2023-01-24T14:48:56+00:00"
      },
      "label": "contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b",
      "claim_version": 1
    }
  },
  "validation_status": [
    {
      "code": "signingCredential.untrusted",
      "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.signature",
      "explanation": "signing certificate untrusted"
    }
  ],
  "validation_results": {
    "activeManifest": {
      "success": [
        {
          "code": "timeStamp.validated",
          "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.signature",
          "explanation": "timestamp message digest matched: DigiCert Timestamp 2022 - 2"
        },
        {
          "code": "timeStamp.trusted",
          "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.signature",
          "explanation": "timestamp cert trusted: DigiCert Timestamp 2022 - 2"
        },
        {
          "code": "claimSignature.insideValidity",
          "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.signature",
          "explanation": "claim signature valid"
        },
        {
          "code": "claimSignature.validated",
          "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.signature",
          "explanation": "claim signature valid"
        },
        {
          "code": "assertion.hashedURI.match",
          "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.assertions/c2pa.thumbnail.claim.jpeg",
          "explanation": "hashed uri matched: self#jumbf=c2pa.assertions/c2pa.thumbnail.claim.jpeg"
        },
        {
          "code": "assertion.hashedURI.match",
          "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.assertions/c2pa.thumbnail.ingredient.jpeg",
          "explanation": "hashed uri matched: self#jumbf=c2pa.assertions/c2pa.thumbnail.ingredient.jpeg"
        },
        {
          "code": "assertion.hashedURI.match",
          "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.assertions/c2pa.ingredient",
          "explanation": "hashed uri matched: self#jumbf=c2pa.assertions/c2pa.ingredient"
        },
        {
          "code": "assertion.hashedURI.match",
          "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.assertions/stds.schema-org.CreativeWork",
          "explanation": "hashed uri matched: self#jumbf=c2pa.assertions/stds.schema-org.CreativeWork"
        },
        {
          "code": "assertion.hashedURI.match",
          "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.assertions/c2pa.actions",
          "explanation": "hashed uri matched: self#jumbf=c2pa.assertions/c2pa.actions"
        },
        {
          "code": "assertion.hashedURI.match",
          "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.assertions/c2pa.hash.data",
          "explanation": "hashed uri matched: self#jumbf=c2pa.assertions/c2pa.hash.data"
        },
        {
          "code": "assertion.dataHash.match",
          "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.assertions/c2pa.hash.data",
          "explanation": "data hash valid"
        }
      ],
      "informational": [],
      "failure": [
        {
          "code": "signingCredential.untrusted",
          "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.signature",
          "explanation": "signing certificate untrusted"
        }
      ]
    },
    "ingredientDeltas": [
      {
        "ingredientAssertionURI": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.assertions/c2pa.ingredient",
        "validationDeltas": {
          "success": [],
          "informational": [
            {
              "code": "ingredient.unknownProvenance",
              "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.assertions/c2pa.ingredient",
              "explanation": "A.jpg: ingredient does not have provenance"
            }
          ],
          "failure": []
        }
      }
    ]
  },
  "validation_state": "Valid"
}
```

## 3. `digitalSourceType` の実パス

JPEG の公式セットには該当フィールドが無かったため、同じ公式 public test files の
`adobe-20240110-single_manifest_store.pdf` を `fromBlob('application/pdf', blob)` で実測した。

```json
[
  {
    "path": "$.manifests.urn:uuid:6d4b57b0-bd89-4774-a3d1-79960c387235.assertions[0].data.actions[0].digitalSourceType",
    "value": "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"
  },
  {
    "path": "$.manifests.urn:uuid:64c58246-c169-4004-9298-f2cc7a0164f9.assertions[0].data.actions[0].digitalSourceType",
    "value": "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"
  },
  {
    "path": "$.manifests.urn:uuid:1ae185fc-88ff-467d-abbf-f7ec96aaaea8.assertions[0].data.actions[0].digitalSourceType",
    "value": "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"
  }
]
```

`manifests` は配列ではなく、manifest label をキーにした object。`assertions` と `actions` は配列。
アサーションの実ラベルはこの出力では `c2pa.actions.v2`。

## 4. validation のフィールド名・型・実値

`node_modules/@contentauth/c2pa-types/dist/types/ManifestStore.d.ts` の実物:

```ts
export type ValidationState = "Invalid" | "Valid" | "Trusted";

export interface Reader {
    active_manifest?: string | null;
    manifests?: { [k: string]: Manifest };
    validation_status?: ValidationStatus[] | null;
    validation_results?: ValidationResults | null;
    validation_state?: ValidationState | null;
    [k: string]: unknown;
}

export interface ValidationStatus {
    code: string;
    url?: string | null;
    explanation?: string | null;
    success?: boolean | null;
    [k: string]: unknown;
}

export interface ValidationResults {
    activeManifest?: StatusCodes | null;
    ingredientDeltas?: IngredientDeltaValidationResult[] | null;
    validationTime?: string | null;
    [k: string]: unknown;
}

export interface StatusCodes {
    success: ValidationStatus[];
    informational: ValidationStatus[];
    failure: ValidationStatus[];
    [k: string]: unknown;
}
```

実測した top-level の値:

```json
{
  "validation_status": [
    {
      "code": "signingCredential.untrusted",
      "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.signature",
      "explanation": "signing certificate untrusted"
    }
  ],
  "validation_state": "Valid"
}
```

破損アサーションを持つ `adobe-20220124-E-uri-CA.jpg` の実値:

```json
{
  "validation_status": [
    {
      "code": "signingCredential.untrusted",
      "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.signature",
      "explanation": "signing certificate untrusted"
    },
    {
      "code": "assertion.hashedURI.mismatch",
      "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.assertions/c2pa.actions",
      "explanation": "hash does not match assertion data: self#jumbf=c2pa.assertions/c2pa.actions"
    }
  ],
  "validation_state": "Invalid"
}
```

`Trusted` は型上の値として確認したが、今回の公式テスト証明書では実値を取得していない。

## 5. remote manifest fetch の設定

`node_modules/@contentauth/c2pa-web/dist/lib/settings.d.ts` の実物:

```ts
export interface Settings {
    trust?: TrustSettings;
    cawgTrust?: CawgTrustSettings;
    verify?: VerifySettings;
    builder?: BuilderSettings;
}

export interface VerifySettings {
    /** Enable trust validation. The default value is "true." */
    verifyTrust?: boolean;
    verifyAfterReading?: boolean;
}
```

**`remoteManifestFetch` は c2pa-web 0.13.1 の公開型に存在しない。** 一方、同梱 WASM を
`strings .../c2pa_bg.wasm | rg 'remote_manifest_fetch'` で実測すると次が含まれる。

```text
verify_after_readingverify_after_signverify_after_sign_hashverify_trustverify_timestamp_trustocsp_fetchremote_manifest_fetchskip_ingredient_conflict_resolutionstrict_v1_validation
```

c2pa-web の `resolveSettings()` 実装は camelCase を snake_case に変換するため、スパイクでは
公開型を拡張して次を渡した。実行時エラーは起きず、破損アサーションの検証まで完了した。

```ts
interface VerifySettingsWithRemoteManifestFetch extends VerifySettings {
  remoteManifestFetch: boolean;
}

const settings = {
  verify: {
    remoteManifestFetch: false,
    verifyAfterReading: true,
    verifyTrust: true,
  },
};
```

ただし、使用した公式公開セットには remote-only manifest の入力が無かったため、外部取得を
実際に試みる資産に対して遮断できたことまでは確認できていない。公開型にない設定へ依存するため、
Phase 1/2 前に「型を局所拡張して使う」「上流へ型追加を依頼する」「inline manifest のみを事前判別する」
のいずれにするか決定が必要。

## 6. trust list 未設定時

デフォルト設定（trust list 未設定）の実値は #2 の全文どおり。要点の生 JSON:

```json
{
  "validation_status": [
    {
      "code": "signingCredential.untrusted",
      "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.signature",
      "explanation": "signing certificate untrusted"
    }
  ],
  "validation_results": {
    "activeManifest": {
      "failure": [
        {
          "code": "signingCredential.untrusted",
          "url": "self#jumbf=/c2pa/contentauth:urn:uuid:04cdf4ec-f713-4e47-a8d6-7af56501ce4b/c2pa.signature",
          "explanation": "signing certificate untrusted"
        }
      ]
    }
  },
  "validation_state": "Valid"
}
```

比較として `{ verify: { verifyTrust: false, verifyAfterReading: true } }` の実値:

```json
{
  "validation_status": null,
  "validation_results": {
    "activeManifest": {
      "informational": [],
      "failure": []
    }
  },
  "validation_state": "Valid"
}
```

重要: trust list 未設定でも `validation_state` は `Valid`。同時に
`signingCredential.untrusted` が failure に入る。したがって `Valid` を「発行者が信頼済み」と
表示してはいけず、`Trusted` と厳密に分離する必要がある。

## 7. C2PA 無し・破損・0バイトの挙動

### C2PA 無し (`adobe-20220124-A.jpg`)

```json
{
  "readerWasNull": true,
  "error": null,
  "manifestStore": null
}
```

`fromBlob()` は `null` を返す。

### 破損 JPEG（8 bytes）

```json
{
  "readerWasNull": false,
  "error": {
    "name": "Error",
    "message": "C2pa(InvalidAsset(\"Could not parse input JPEG\"))",
    "cause": null,
    "ownProperties": {
      "message": "C2pa(InvalidAsset(\"Could not parse input JPEG\"))"
    }
  },
  "manifestStore": null
}
```

### 0バイト JPEG

```json
{
  "readerWasNull": false,
  "error": {
    "name": "Error",
    "message": "C2pa(UnsupportedType)",
    "cause": null,
    "ownProperties": {
      "message": "C2pa(UnsupportedType)"
    }
  },
  "manifestStore": null
}
```

破損と0バイトは例外。例外オブジェクトに機械可読な `code` は無く、実測上は `name`, `message`,
`stack` のみだった。本実装では message 文字列を verdict 判定に利用せず、SourceResult の
安定した独自 error code へ境界で変換する必要がある。

## 8. メインスレッド停止時間

入力: `adobe-20220124-CAIAIIICAICIICAIICICA.jpg`（1629926 bytes）を同一 SDK で5回。
4 ms interval の最大遅延と Long Tasks API を並行採取した生 JSON:

```json
[
  {
    "elapsedMs": 80.90000000596046,
    "maxTimerGapMs": 4.200000002980232,
    "estimatedMaxBlockMs": 0.20000000298023224,
    "longTasks": []
  },
  {
    "elapsedMs": 73.59999999403954,
    "maxTimerGapMs": 4.299999997019768,
    "estimatedMaxBlockMs": 0.29999999701976776,
    "longTasks": []
  },
  {
    "elapsedMs": 71.29999999701977,
    "maxTimerGapMs": 4.200000002980232,
    "estimatedMaxBlockMs": 0.20000000298023224,
    "longTasks": []
  },
  {
    "elapsedMs": 72.70000000298023,
    "maxTimerGapMs": 4.4000000059604645,
    "estimatedMaxBlockMs": 0.4000000059604645,
    "longTasks": []
  },
  {
    "elapsedMs": 71.6000000089407,
    "maxTimerGapMs": 4.200000002980232,
    "estimatedMaxBlockMs": 0.20000000298023224,
    "longTasks": []
  }
]
```

WASM 初期化時間は同じキャッシュ無効実行で `125 ms`。解析処理の wall time は
`71.29999999701977`〜`80.90000000596046 ms`、推定最大メインスレッド停止は
`0.20000000298023224`〜`0.4000000059604645 ms`、50 ms 以上の Long Task は 0 件。

理由は @contentauth/c2pa-web 0.13.1 が内部 Web Worker で WASM を実行するため。
C2PA のために Sourceglass 独自 Worker を二重化する必要はない。将来の他 detector と
runner 全体の Worker 境界は別の設計判断として残る。

## 9. WASM を含む build 後の実サイズ

実行ログ:

```text
> sourceglass-phase0-spike@0.0.0 build
> tsc --noEmit && vite build

vite v7.3.6 building client environment for production...
transforming...
9 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                          0.47 kB
dist/assets/c2pa_worker-S_R-KLYT.js     40.98 kB
dist/assets/c2pa_bg-DEq14Vmg.wasm    8,269.37 kB
dist/assets/index-CiDU-VE0.js           38.85 kB
built in 329ms
```

`stat` と `gzip -c | wc -c` の実値:

```text
file                                             raw bytes  gzip bytes
dist/index.html                                         473         307
dist/assets/c2pa_worker-S_R-KLYT.js                   40981        9593
dist/assets/index-CiDU-VE0.js                         38847       12464
dist/assets/c2pa_bg-DEq14Vmg.wasm                   8269371     3027183
```

アプリ資産（フィクスチャ除外）の raw 合計は `8349672 bytes`。`dist/` 全体は、公式フィクスチャを
含め `11025351 bytes`。

## 設計前提と異なった点

1. `createC2pa(config)` の実型は `Promise<C2paSdk>`。設計資料の例のような同期呼び出しではなく
   `const c2pa = await createC2pa({ wasmSrc })` が必要。
2. v0.13.1 は WASM 処理を内部 Web Worker で実行する。C2PA 解析のメインスレッド停止は今回最大
   `0.4000000059604645 ms` だった。
3. `workerSrc` は HTTP localhost を拒否する。Cloudflare Pages の HTTPS では同一オリジン URL を
   指定できるが、ローカル HTTP では Blob Worker が必要。現行 CSP 案には `worker-src` が無く、
   `script-src` に `blob:` も無いため、開発/プレビュー方式を含め Phase 1 で整合確認が必要。
4. remote manifest fetch のキーは WASM にあるが c2pa-web の公開型に無い。
5. `validation_state: "Valid"` と `signingCredential.untrusted` は同時に成立する。
6. C2PA 無しは `null`、壊れた画像は例外であり、同じ経路として扱えない。

## 9項目の確認状況

| # | 状況 | 備考 |
| --- | --- | --- |
| 1 | 確認済み | WASM は同一オリジン。CDP 全リクエストを記録 |
| 2 | 確認済み | 公式 JPEG の JSON 全文を記録 |
| 3 | 確認済み | 公式 PDF の3パスを実測 |
| 4 | 確認済み | d.ts と Valid / Invalid の実値を記録。Trusted 実値は未取得 |
| 5 | 一部未確認 | 公開型には無し、WASM には有り、実行時受理まで確認。remote-only 資産で遮断は未再現 |
| 6 | 確認済み | trust list 未設定で Valid + signingCredential.untrusted |
| 7 | 確認済み | 無しは null、破損と0バイトは異なる Error |
| 8 | 確認済み | 5回実測、最大停止 0.4000000059604645 ms、Long Task 0件 |
| 9 | 確認済み | WASM raw 8269371 bytes、gzip 3027183 bytes |

## Phase 1/2 前に決めること

1. 公開型に無い `remoteManifestFetch: false` を局所的な型拡張で渡すか。採用前に remote-only
   manifest fixture を自作または調達し、CDP で外部リクエスト 0 件を再確認する。
2. `workerSrc` の HTTPS 制約と CSP をどう整合させるか。本番は同一オリジン Worker URL、
   HTTP 開発は Blob Worker とするなら、開発時 CSP と本番 CSP を分ける必要がある。
3. C2PA SDK 自体が Worker を持つ事実を踏まえ、`inspect.worker.ts` から C2PA Worker を起動する
   二重 Worker 構成を採るか、C2PA detector だけメイン側から SDK Worker を使うか。
4. UI/内部型では `validation_state` と trust status を別フィールドとして扱い、`Valid` を
   trust の根拠にしない。
