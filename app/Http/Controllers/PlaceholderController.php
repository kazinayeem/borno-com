<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;

/** Tiny initials-on-colour SVG used for seeded images that have no uploaded file. */
class PlaceholderController extends Controller
{
    public function show(string $label)
    {
        $hue = (int) request()->query('h', 340) % 360;
        $text = preg_replace('/\.svg$/i', '', urldecode($label));
        $initials = mb_strtoupper(mb_substr(implode('', array_map(fn ($w) => mb_substr($w, 0, 1), preg_split('/\s+/', trim($text)) ?: [])), 0, 2));
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="12" fill="hsl('.$hue.',70%,92%)"/>'
            .'<text x="40" y="49" font-family="system-ui,sans-serif" font-size="26" font-weight="700" text-anchor="middle" fill="hsl('.$hue.',55%,38%)">'.e($initials).'</text></svg>';

        return new Response($svg, 200, ['Content-Type' => 'image/svg+xml', 'Cache-Control' => 'public, max-age=86400']);
    }
}
