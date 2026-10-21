<?php

namespace App\Support;

use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;

/** Cleans editor HTML before it is stored, so the storefront can render it. Scripts, event handlers and unsafe URLs never survive. */
class Html
{
    /** Editor fields per admin resource. */
    public const RICH = [
        'products' => ['description'],
        'categories' => ['description', 'description_ar'],
        'shops' => ['description'],
        'flash-sales' => ['description'],
        'blogs' => ['body'],
    ];

    private static ?HtmlSanitizer $sanitizer = null;

    public static function clean(?string $html): ?string
    {
        if ($html === null || trim($html) === '') {
            return $html;
        }
        self::$sanitizer ??= new HtmlSanitizer(
            (new HtmlSanitizerConfig())
                ->allowElement('p')->allowElement('br')->allowElement('strong')->allowElement('b')->allowElement('em')->allowElement('i')
                ->allowElement('u')->allowElement('s')->allowElement('sub')->allowElement('sup')->allowElement('blockquote')
                ->allowElement('pre')->allowElement('code')->allowElement('hr')
                ->allowElement('h1')->allowElement('h2')->allowElement('h3')->allowElement('h4')
                ->allowElement('ul')->allowElement('ol')->allowElement('li')
                ->allowElement('span')->allowElement('div')
                ->allowElement('a', ['href', 'title'])
                ->allowElement('img', ['src', 'alt', 'width', 'height'])
                ->allowElement('table')->allowElement('thead')->allowElement('tbody')->allowElement('tr')->allowElement('th')->allowElement('td')
                ->allowAttribute('class', '*')->allowAttribute('style', ['span', 'p', 'div', 'h1', 'h2', 'h3', 'h4', 'li'])
                ->allowAttribute('dir', '*')
                ->allowLinkSchemes(['https', 'http', 'mailto', 'tel'])->allowMediaSchemes(['https', 'http'])
                ->forceAttribute('a', 'rel', 'noopener noreferrer nofollow')->forceAttribute('a', 'target', '_blank')
                ->allowRelativeLinks(true)->allowRelativeMedias(true)
        );
        $out = self::$sanitizer->sanitize($html);
        // Only the colours the editor produces may remain in style=""; class names are limited to the editor's own (ql-*).
        $out = preg_replace_callback('/\sstyle="([^"]*)"/i', function ($m) {
            $keep = [];
            foreach (explode(';', html_entity_decode($m[1])) as $decl) {
                if (preg_match('/^\s*(color|background-color)\s*:\s*(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*(,\s*[\d.]+\s*){2,3}\)|[a-z]{3,20})\s*$/i', $decl, $d)) {
                    $keep[] = strtolower($d[1]).':'.strtolower(trim($d[2]));
                }
            }

            return $keep ? ' style="'.implode(';', $keep).'"' : '';
        }, $out);
        $out = preg_replace_callback('/\sclass="([^"]*)"/i', function ($m) {
            $keep = array_filter(preg_split('/\s+/', trim($m[1])), fn ($c) => preg_match('/^ql-[a-z0-9-]+$/', $c));

            return $keep ? ' class="'.implode(' ', $keep).'"' : '';
        }, $out);

        return $out;
    }
}
