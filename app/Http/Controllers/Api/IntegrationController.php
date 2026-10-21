<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\Mailer;
use App\Services\Sms;
use App\Support\EmailTemplates;
use App\Support\Html;
use Illuminate\Http\Request;

/** Email templates, plus "send a test" buttons for the mail and SMS settings pages. */
class IntegrationController extends Controller
{
    public function templates()
    {
        return ['templates' => array_values(EmailTemplates::all()), 'variables' => EmailTemplates::VARS, 'enabled' => Mailer::enabled()];
    }

    public function updateTemplate(Request $request, string $key)
    {
        abort_unless(isset(EmailTemplates::defaults()[$key]), 404);
        $v = $request->validate(['subject' => 'sometimes|required|string|max:200', 'body' => 'sometimes|required|string|max:50000', 'enabled' => 'sometimes|boolean', 'reset' => 'sometimes|boolean']);
        $saved = Setting::all_()['email_templates'] ?? [];
        $cur = is_array($saved[$key] ?? null) ? $saved[$key] : [];
        if (! empty($v['reset'])) {
            $cur = ['enabled' => $cur['enabled'] ?? true];
        } else {
            if (isset($v['subject'])) {
                $cur['subject'] = $v['subject'];
            }
            if (isset($v['body'])) {
                $cur['body'] = Html::clean($v['body']);
            }
        }
        if (isset($v['enabled'])) {
            $cur['enabled'] = $v['enabled'];
        }
        $saved[$key] = $cur;
        Setting::put(['email_templates' => $saved]);

        return EmailTemplates::all()[$key];
    }

    public function testMail(Request $request)
    {
        $v = $request->validate(['to' => 'required|email|max:160', 'template' => 'nullable|string']);
        $tpl = $v['template'] ?? 'test';
        abort_unless(isset(EmailTemplates::defaults()[$tpl]), 422, 'Unknown template.');
        [$ok, $msg] = Mailer::send($tpl, $v['to'], ['customer_name' => 'Sample Customer', 'order_number' => 'RC000123', 'order_total' => \App\Support\Money::format(129), 'order_status' => 'Confirmed', 'order_link' => url('/account/orders'), 'product_name' => 'Sample product', 'stock_left' => 2], true);

        return response()->json(['ok' => $ok, 'message' => $ok ? 'Test email sent to '.$v['to'].'.' : $msg], $ok ? 200 : 422);
    }

    public function testSms(Request $request)
    {
        $v = $request->validate(['to' => 'required|string|max:30']);
        [$ok, $msg] = Sms::send($v['to'], 'Test SMS from '.Mailer::appName());

        return response()->json(['ok' => $ok, 'message' => $ok ? 'Test SMS accepted by the provider.' : $msg], $ok ? 200 : 422);
    }
}
