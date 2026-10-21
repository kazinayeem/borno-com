<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class UploadController extends Controller
{
    /** Digital product files go to the private disk (never under /storage), and are only handed out through the download endpoint. */
    public function digital(Request $request)
    {
        $request->validate(['file' => ['required', 'file', 'mimes:zip,pdf,epub,mp3,mp4,txt,doc,docx,xls,xlsx,csv,png,jpg,jpeg,webp,json', 'max:102400']]);
        $name = bin2hex(random_bytes(12)).'.'.strtolower($request->file('file')->getClientOriginalExtension());
        $request->file('file')->storeAs('digital', $name, 'local');

        return response()->json(['path' => 'digital/'.$name, 'name' => $request->file('file')->getClientOriginalName()], 201);
    }

    public function image(Request $request)
    {
        $request->validate(['file' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:2048']]);

        $path = $request->file('file')->store('uploads', 'public');

        return response()->json(['path' => $path, 'url' => '/storage/'.$path], 201);
    }
}
