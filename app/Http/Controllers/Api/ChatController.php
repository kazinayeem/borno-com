<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    /** Customers who have written, newest conversation first, with unread counts. */
    public function users()
    {
        $last = ChatMessage::selectRaw('customer_id, max(id) as last_id')->groupBy('customer_id')->orderByDesc('last_id')->get();
        $users = User::whereIn('id', $last->pluck('customer_id'))->get(['id', 'name'])->keyBy('id');
        $unread = ChatMessage::where('from_staff', false)->whereNull('read_at')->selectRaw('customer_id, count(*) as c')->groupBy('customer_id')->pluck('c', 'customer_id');

        return $last->map(function ($l) use ($users, $unread) {
            $m = ChatMessage::find($l->last_id);

            return ['id' => $l->customer_id, 'name' => $users[$l->customer_id]->name, 'last_message' => $m->body, 'last_at' => $m->created_at, 'unread' => (int) ($unread[$l->customer_id] ?? 0)];
        })->values();
    }

    public function messages(int $customer)
    {
        abort_unless(User::where('role', 'customer')->whereKey($customer)->exists(), 404);
        ChatMessage::where('customer_id', $customer)->where('from_staff', false)->whereNull('read_at')->update(['read_at' => now()]);

        return ChatMessage::where('customer_id', $customer)->orderBy('id')->limit(200)->get(['id', 'from_staff', 'body', 'created_at']);
    }

    public function send(Request $request, int $customer)
    {
        abort_unless(User::where('role', 'customer')->whereKey($customer)->exists(), 404);
        $data = $request->validate(['body' => 'required|string|max:2000']);

        return response()->json(ChatMessage::create(['customer_id' => $customer, 'from_staff' => true, 'body' => trim($data['body'])]), 201);
    }
}
