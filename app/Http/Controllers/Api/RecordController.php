<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Record;
use App\Support\Spec;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/** CRUD for the admin resources that live in the generic `records` table. Admin only. */
class RecordController extends Controller
{
    private function check(string $res): void
    {
        abort_unless(in_array($res, Spec::RECORD_RESOURCES, true), 404);
    }

    public function index(Request $request, string $res)
    {
        $this->check($res);
        $q = Record::where('resource', $res);
        if ($s = trim((string) $request->query('search'))) {
            $q->where('data', 'like', '%'.str_replace(['%', '_'], ['\%', '\_'], $s).'%');
        }
        // Any scalar query param that is not paging/search filters on that stored field (tabs, selects, ids).
        foreach ($request->except(['search', 'page', 'per_page', 'from', 'to']) as $k => $v) {
            if (is_scalar($v) && $v !== '' && preg_match('/^\w+$/', $k)) {
                $q->where("data->$k", $v);
            }
        }
        if ($request->filled('from')) {
            $q->whereDate('created_at', '>=', $request->query('from'));
        }
        if ($request->filled('to')) {
            $q->whereDate('created_at', '<=', $request->query('to'));
        }
        $page = $q->orderByDesc('rid')->paginate(min((int) $request->query('per_page', 10), 100));
        $page->getCollection()->transform(fn (Record $r) => $r->flat());

        return $page;
    }

    public function show(string $res, int $id)
    {
        $this->check($res);

        return $this->find($res, $id)->flat();
    }

    public function store(Request $request, string $res)
    {
        $this->check($res);
        $fields = Spec::fieldsFor($res);
        $data = $this->clean($request->validate(Spec::rules($fields, true)), $fields);
        $record = DB::transaction(fn () => Record::create([
            'resource' => $res, 'rid' => (int) Record::where('resource', $res)->max('rid') + 1,
            'data' => $data + $this->defaults($res),
        ]));

        return response()->json($record->flat(), 201);
    }

    public function update(Request $request, string $res, int $id)
    {
        $this->check($res);
        $record = $this->find($res, $id);
        $fields = Spec::fieldsFor($res);
        $data = $this->clean($request->validate(Spec::rules($fields, false, $record->data)), $fields);
        $record->update(['data' => array_merge($record->data, $data)]);

        return $record->flat();
    }

    public function destroy(string $res, int $id)
    {
        $this->check($res);
        $this->find($res, $id)->delete();

        return response()->noContent();
    }

    /** Flip a boolean column (status switches). Only fields the spec declares as toggles are allowed. */
    public function toggle(Request $request, string $res, int $id)
    {
        $this->check($res);
        $field = $request->query('field', 'is_active');
        abort_unless(in_array($field, Spec::toggleFields($res), true), 422, 'This field cannot be toggled.');
        $record = $this->find($res, $id);
        $record->update(['data' => array_merge($record->data, [$field => ! ($record->data[$field] ?? false)])]);

        return $record->flat();
    }

    /** Approve / reject a pending request (withdrawals, cash deposits, …). Allowed only for resources whose spec lists the action. */
    public function decide(string $res, int $id, string $decision)
    {
        $this->check($res);
        abort_unless(in_array($decision, ['approve', 'reject'], true) && in_array($decision, Spec::actionsFor($res), true), 404);
        $record = $this->find($res, $id);
        abort_unless(strtolower($record->data['status'] ?? '') === 'pending', 422, 'Only pending requests can be approved or rejected.');
        $record->update(['data' => array_merge($record->data, ['status' => $decision === 'approve' ? 'Approved' : 'Rejected'])]);

        return $record->flat();
    }

    private function find(string $res, int $id): Record
    {
        return Record::where('resource', $res)->where('rid', $id)->firstOrFail();
    }

    /** Keep only declared fields; hash passwords; drop confirmation helpers. */
    private function clean(array $valid, array $fields): array
    {
        $out = [];
        foreach ($valid as $k => $v) {
            if (! isset($fields[$k]) || str_ends_with($k, '_confirmation')) {
                continue;
            }
            $out[$k] = $fields[$k]['type'] === 'password' && $v !== null ? Hash::make($v) : $v;
        }

        return $out;
    }

    private function defaults(string $res): array
    {
        return in_array('is_active', Spec::toggleFields($res), true) ? ['is_active' => true] : [];
    }
}
