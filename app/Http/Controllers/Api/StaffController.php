<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\StaffRole;
use App\Models\User;
use App\Support\Permissions;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Roles, staff accounts and the activity / login logs. Only a super admin (no staff role) may manage these. */
class StaffController extends Controller
{
    private function superOnly(Request $request): void
    {
        abort_unless($request->user()->role === 'admin' && $request->user()->staffPermissions() === null, 403, 'Only a super admin can manage roles and staff.');
    }

    public function catalog()
    {
        return ['modules' => Permissions::catalog(), 'actions' => Permissions::ACTIONS];
    }

    // ---- roles ------------------------------------------------------------------------------------------------------

    public function roles()
    {
        return StaffRole::withCount('users')->orderBy('name')->get();
    }

    public function storeRole(Request $request)
    {
        $this->superOnly($request);

        return response()->json(StaffRole::create($this->roleData($request)), 201);
    }

    public function updateRole(Request $request, int $id)
    {
        $this->superOnly($request);
        $role = StaffRole::findOrFail($id);
        $role->update($this->roleData($request, $role));

        return $role->refresh();
    }

    public function destroyRole(Request $request, int $id)
    {
        $this->superOnly($request);
        $role = StaffRole::withCount('users')->findOrFail($id);
        abort_if($role->users_count > 0, 422, 'Move or remove its staff first. This role is still assigned.');
        $role->delete();

        return response()->noContent();
    }

    private function roleData(Request $request, ?StaffRole $current = null): array
    {
        $v = $request->validate([
            'name' => ['required', 'string', 'max:60', Rule::unique('staff_roles', 'name')->ignore($current?->id)],
            'permissions' => 'required|array',
        ]);
        $v['permissions'] = Permissions::clean($v['permissions']);

        return $v;
    }

    // ---- staff accounts ---------------------------------------------------------------------------------------------

    private function staffQuery()
    {
        return User::where('role', 'admin')->whereNotNull('staff_role_id');
    }

    public function staff()
    {
        return $this->staffQuery()->with('staffRole:id,name')->orderBy('name')->get(['id', 'name', 'email', 'phone', 'staff_role_id', 'created_at']);
    }

    public function storeStaff(Request $request)
    {
        $this->superOnly($request);
        $v = $request->validate([
            'name' => 'required|string|max:120', 'email' => 'required|email|max:160|unique:users,email', 'phone' => 'nullable|string|max:30',
            'password' => 'required|string|min:8|max:100|confirmed', 'staff_role_id' => 'required|exists:staff_roles,id',
        ]);
        $u = User::create(['name' => $v['name'], 'email' => $v['email'], 'phone' => $v['phone'] ?? null, 'password' => $v['password'], 'role' => 'admin', 'staff_role_id' => $v['staff_role_id']]);

        return response()->json($u->only(['id', 'name', 'email', 'phone', 'staff_role_id']), 201);
    }

    public function updateStaff(Request $request, int $id)
    {
        $this->superOnly($request);
        $u = $this->staffQuery()->findOrFail($id);
        $v = $request->validate([
            'name' => 'sometimes|required|string|max:120', 'email' => ['sometimes', 'required', 'email', 'max:160', Rule::unique('users', 'email')->ignore($u->id)],
            'phone' => 'nullable|string|max:30', 'staff_role_id' => 'sometimes|required|exists:staff_roles,id', 'password' => 'nullable|string|min:8|max:100|confirmed',
        ]);
        if (empty($v['password'])) {
            unset($v['password']);
        }
        $u->update($v);
        if (isset($v['password'])) {
            $u->tokens()->delete(); // a new password signs the person out everywhere
        }

        return $u->only(['id', 'name', 'email', 'phone', 'staff_role_id']);
    }

    public function destroyStaff(Request $request, int $id)
    {
        $this->superOnly($request);
        $u = $this->staffQuery()->findOrFail($id);
        $u->tokens()->delete();
        $u->delete();

        return response()->noContent();
    }

    // ---- logs -------------------------------------------------------------------------------------------------------

    public function logs(Request $request)
    {
        $q = ActivityLog::query()->latest('id');
        if ($request->query('kind') === 'login') {
            $q->whereIn('action', ['login', 'login_failed', 'logout']);
        } elseif ($request->query('kind') === 'activity') {
            $q->whereIn('action', ['create', 'update', 'delete']);
        }
        if ($a = $request->query('action')) {
            $q->where('action', $a);
        }
        if ($u = $request->query('user_id')) {
            $q->where('user_id', (int) $u);
        }
        if ($s = trim((string) $request->query('search'))) {
            $q->where(fn ($w) => $w->where('user_name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")->orWhere('ip', 'like', "%{$s}%")->orWhere('description', 'like', "%{$s}%"));
        }
        if ($from = $request->query('from')) {
            $q->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $q->whereDate('created_at', '<=', $to);
        }

        return $q->paginate(min((int) $request->query('per_page', 20), 100));
    }
}
