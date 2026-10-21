<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Record;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** "Push Notification": records a broadcast to customers. Nothing is delivered to a device (no FCM wired). */
class PushController extends Controller
{
    public function send(Request $request)
    {
        $data = $request->validate(['title' => 'required|string|max:120', 'description' => 'required|string|max:500', 'audience' => 'required|in:all,with_orders']);
        $q = User::where('role', 'customer');
        if ($data['audience'] === 'with_orders') {
            $q->whereHas('orders');
        }
        $record = DB::transaction(fn () => Record::create([
            'resource' => 'customer_notifications', 'rid' => (int) Record::where('resource', 'customer_notifications')->max('rid') + 1,
            'data' => $data + ['recipients' => $q->count(), 'delivered' => false],
        ]));

        return response()->json($record->flat(), 201);
    }
}
