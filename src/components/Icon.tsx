/**
 * Sourceglass — アイコン
 *
 * ★ このファイルはデザイン仕様そのものです。
 *   仕様: ai_tasks/20260804_sourceglass_mvp_design/design.md §6
 *
 * ★ 実装者（人間・AIを問わず）はこのファイルを編集しないでください。
 *   アイコンの追加が必要になった場合は、実装せずに相談してください。
 *
 * なぜ自前 SVG なのか:
 *   Unicode のテキスト記号（警告の三角、丸囲みの i など）は、環境によって
 *   カラー絵文字として描画されます。
 *   モノクロで統一した画面に、突然オレンジの絵文字が1つ乗ることになり、
 *   この製品のデザイン（色相で判断を誘導しない）が破綻します。
 *
 *   currentColor で描いているため、反転（.result--emph）にもダークモードにも
 *   自動追従します。
 */

/** 結果表示で使うアイコン。この3つ以外は追加しないこと。 */
export type IconName =
  /** AI 関連の記録が見つかった */
  | 'warn'
  /** 来歴の記録が残っていない */
  | 'info'
  /** AI 関連の記録が見つからなかった */
  | 'none';

interface IconProps {
  name: IconName;
  /**
   * スクリーンリーダー向けの説明。
   * 見出しテキストが状態を十分に説明している場合は省略し、装飾として扱う。
   */
  label?: string;
}

/**
 * 結果ブロックの見出しに置くアイコン。
 *
 * インライン SVG にしているのは、外部スプライトを `<use href="/icons.svg#...">`
 * で参照するとネットワークリクエストが1本増えるため。同一オリジンなので
 * プライバシー上の問題はないが、リクエストは少ないほど検証しやすい。
 */
export function Icon({ name, label }: IconProps) {
  const shared = {
    className: 'icon',
    viewBox: '0 0 20 20',
    xmlns: 'http://www.w3.org/2000/svg',
    ...(label === undefined
      ? { 'aria-hidden': true as const }
      : { role: 'img' as const, 'aria-label': label }),
  };

  switch (name) {
    case 'warn':
      return (
        <svg {...shared}>
          <path
            d="M10 2.6 18.2 17H1.8L10 2.6Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M10 8v3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="10" cy="14.2" r="0.85" fill="currentColor" />
        </svg>
      );

    case 'info':
      return (
        <svg {...shared}>
          <circle cx="10" cy="10" r="7.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10 9.2v4.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="10" cy="6.4" r="0.85" fill="currentColor" />
        </svg>
      );

    case 'none':
      return (
        <svg {...shared}>
          <path d="M3.4 10h13.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
  }
}
