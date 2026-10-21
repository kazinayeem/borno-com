<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class UploadController extends Controller
{
    public function image(Request $request)
    {
        $request->validate(['file' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:2048']]);

        $path = $request->file('file')->store('uploads', 'public');

        return response()->json(['path' => $path, 'url' => '/storage/'.$path], 201);
    }
}
