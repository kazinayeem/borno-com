import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { errorMessage, useAdminGetQuery, useAdminSaveMutation, useGetOptionsQuery } from '../../app/api';
import { pushToast } from '../../app/slices';
import { Field, FormActions, ImagePicker, MultiSelect, PageTitle, Section, Select, TagInput, TextArea, TextInput } from '../../components/FormKit';

// Shared create/edit plumbing: loads the record when editing, saves, shows toasts + server validation errors.
function useAdminForm(res, initial, backTo) {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [form, setForm] = useState(initial);
    const { data: record, isLoading } = useAdminGetQuery({ res, id }, { skip: !id });
    const [save, { isLoading: saving, error }] = useAdminSaveMutation();
    useEffect(() => { if (record) setForm({ ...initial, ...Object.fromEntries(Object.entries(record).filter(([, v]) => v !== null)) }); }, [record]); // eslint-disable-line
    const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
    const errs = error?.data?.errors ?? {};
    const err = (k) => errs[k]?.[0];
    const submit = async (e) => {
        e.preventDefault();
        const r = await save({ res, id, ...form });
        if (r.error) return dispatch(pushToast(errorMessage(r.error), 'error'));
        dispatch(pushToast(id ? 'Updated successfully' : 'Created successfully'));
        navigate(backTo);
    };
    return { id, form, set, err, submit, saving, isLoading: id && isLoading, reset: () => setForm(initial) };
}

const Loading = () => <div className="skeleton h-72" />;

export function CategoryForm() {
    const { id, form, set, err, submit, saving, isLoading, reset } = useAdminForm('categories', { name: '', name_ar: '', order_by: 0, description: '', description_ar: '', active: true }, '/admin/categories');
    if (isLoading) return <Loading />;
    return (
        <form onSubmit={submit} className="mx-auto max-w-[900px]">
            <PageTitle icon="grid">{id ? 'Edit Category' : 'Create New Category'}</PageTitle>
            <Section title="Category Information" icon="user">
                <Field label="Name" required error={err('name')}><TextInput value={form.name} onChange={set('name')} placeholder="Enter Name" /></Field>
                <Field label="Name (2nd Language)" error={err('name_ar')}><TextInput value={form.name_ar} onChange={set('name_ar')} placeholder="Enter Arabic name" /></Field>
                <Field label="Order By" error={err('order_by')}><TextInput type="number" value={form.order_by} onChange={set('order_by')} placeholder="Enter category order" /></Field>
                <ImagePicker label="Icon *" width="w-60" ratio="aspect-[3/4]" />
                <Field label="Description"><TextArea value={form.description} onChange={set('description')} placeholder="Enter description" /></Field>
                <Field label="Description (2nd Language)"><TextArea value={form.description_ar} onChange={set('description_ar')} placeholder="Enter Arabic description" /></Field>
            </Section>
            <FormActions saving={saving} onReset={id ? undefined : reset} back="/admin/categories" />
        </form>
    );
}

export function ShopForm() {
    const empty = { first_name: '', last_name: '', phone: '', gender: 'male', email: '', password: '', password_confirmation: '', name: '', name_ar: '', address: '', description: '', active: true };
    const { id, form, set, err, submit, saving, isLoading } = useAdminForm('shops', empty, '/admin/shops');
    if (isLoading) return <Loading />;
    return (
        <form onSubmit={submit} className="mx-auto max-w-[1100px]">
            <PageTitle icon="store">{id ? 'Edit Shop' : 'Add New Shop'}</PageTitle>
            {!id && (<>
                <Section title="User Information" icon="user"><div className="grid gap-x-6 md:grid-cols-[1fr_1fr_220px]">
                    <div className="md:col-span-2"><div className="grid gap-x-6 md:grid-cols-2">
                        <Field label="First Name" required error={err('first_name')}><TextInput value={form.first_name} onChange={set('first_name')} placeholder="Enter Name" /></Field>
                        <Field label="Last Name" error={err('last_name')}><TextInput value={form.last_name} onChange={set('last_name')} placeholder="Enter Name" /></Field></div>
                        <Field label="Phone Number" required error={err('phone')}><TextInput value={form.phone} onChange={set('phone')} placeholder="Enter phone number" /></Field>
                        <Field label="Gender"><Select value={form.gender} onChange={set('gender')} options={[{ id: 'male', name: 'Male' }, { id: 'female', name: 'Female' }]} /></Field></div>
                    <ImagePicker label="User profile (Ratio 1:1) *" width="w-36" /></div></Section>
                <Section title="Account Information" icon="user"><div className="grid gap-x-6 md:grid-cols-3">
                    <Field label="Email" required error={err('email')}><TextInput type="email" value={form.email} onChange={set('email')} placeholder="Enter Email Address" /></Field>
                    <Field label="Password" required error={err('password')}><TextInput type="password" value={form.password} onChange={set('password')} placeholder="Enter Password" /></Field>
                    <Field label="Confirm Password" required><TextInput type="password" value={form.password_confirmation} onChange={set('password_confirmation')} placeholder="Enter Confirm Password" /></Field></div></Section></>)}
            <Section title="Shop Information" icon="store"><div className="grid gap-x-6 md:grid-cols-3">
                <Field label="Shop Name" required error={err('name')}><TextInput value={form.name} onChange={set('name')} placeholder="Enter Shop Name" /></Field>
                <Field label="Shop Name (2nd Language)"><TextInput value={form.name_ar} onChange={set('name_ar')} placeholder="Enter Arabic shop name" /></Field>
                <Field label="Address"><TextInput value={form.address} onChange={set('address')} placeholder="Enter Address" /></Field></div>
                <div className="grid gap-x-6 md:grid-cols-2"><ImagePicker label="Shop logo(Ratio 1:1) *" width="w-36" /><ImagePicker label="Shop banner Ratio 4:1 (2000 x 500 px) *" width="w-full max-w-sm" ratio="aspect-[4/1]" /></div>
                <Field label="Description"><TextArea value={form.description} onChange={set('description')} placeholder="Enter Description" rows={4} /></Field></Section>
            <FormActions saving={saving} back="/admin/shops" />
        </form>
    );
}

export function ProductForm() {
    const empty = { name: '', name_ar: '', slug: '', short_description: '', short_description_ar: '', description: '', category_id: '', brand_id: '', shop_id: '', color_ids: [], size_ids: [], unit: '', sku: '', weight: '', buy_price: '', price: '', discount_type: 'fixed', discount_price: '', stock: '', video_type: 'file', video_url: '', meta_title: '', meta_description: '', meta_keywords: [], active: true };
    const { id, form, set, err, submit, saving, isLoading, reset } = useAdminForm('products', empty, '/admin/products');
    const { data: opt } = useGetOptionsQuery();
    if (isLoading) return <Loading />;
    const o = opt ?? { categories: [], brands: [], shops: [], colors: [], sizes: [], units: [] };
    const num = (k, label, extra = {}) => <Field label={label} required={extra.required} error={err(k)}><TextInput value={form[k]} onChange={set(k)} placeholder={label.replace(' *', '')} {...extra.input} /></Field>;
    return (
        <form onSubmit={submit} className="mx-auto max-w-[1100px]">
            <PageTitle icon="box">{id ? 'Edit Product' : 'Add New Product'}</PageTitle>
            <Section title="Product Info">
                <Field label="Product Name" required error={err('name')}><TextInput value={form.name} onChange={set('name')} placeholder="Enter Product Name" /></Field>
                <Field label="Product Name (2nd Language)"><TextInput value={form.name_ar} onChange={set('name_ar')} placeholder="Enter Arabic product name" /></Field>
                <Field label="Product Slug" hint="Leave blank to auto generate from product name"><TextInput value={form.slug} onChange={set('slug')} placeholder="Enter Product Slug" /></Field>
                <Field label="Short Description" required error={err('short_description')}><TextArea value={form.short_description} onChange={set('short_description')} placeholder="Enter short description" /></Field>
                <Field label="Short Description (2nd Language)"><TextArea value={form.short_description_ar} onChange={set('short_description_ar')} placeholder="Enter Arabic short description" /></Field>
                <Field label="Description" required error={err('description')}><TextArea rows={6} value={form.description} onChange={set('description')} placeholder="Enter description" /></Field>
            </Section>
            <Section title="Thumbnail (Ratio 1280 x 960 px) *"><ImagePicker label="" width="w-60" ratio="aspect-[4/3]" /></Section>
            <Section title="Additional Thumbnail (Ratio 1280 x 960 px)"><ImagePicker label="" width="w-60" ratio="aspect-[4/3]" /></Section>
            <Section title="Product Information"><div className="grid gap-x-6 md:grid-cols-3">
                <Field label="Select Shop" required error={err('shop_id')}><Select value={form.shop_id} onChange={set('shop_id')} options={o.shops} placeholder="Select Shop" /></Field>
                <Field label="Select Category" required error={err('category_id')}><Select value={form.category_id} onChange={set('category_id')} options={o.categories} placeholder="Select Category" /></Field>
                <Field label="Select Brand"><Select value={form.brand_id} onChange={set('brand_id')} options={o.brands} placeholder="Select Brand" /></Field>
                <Field label="Select Color"><MultiSelect value={form.color_ids} onChange={set('color_ids')} options={o.colors} /></Field>
                <Field label="Select Unit"><Select value={form.unit} onChange={set('unit')} options={o.units} placeholder="Select Unit" /></Field>
                <Field label="Select Size"><MultiSelect value={form.size_ids} onChange={set('size_ids')} options={o.sizes} /></Field>
                <Field label="Product SKU" required error={err('sku')}><div className="flex gap-2"><TextInput value={form.sku} onChange={set('sku')} placeholder="Ex: 134543" /><button type="button" onClick={() => set('sku')(String(Math.floor(100000 + Math.random() * 900000)))} className="whitespace-nowrap rounded-md bg-primary-soft px-3 text-xs text-primary">Generate Code</button></div></Field>
                {num('weight', 'Product Weight (in kg)')}
                {num('buy_price', 'Buying Price *', { required: true })}
                {num('price', 'Selling Price *', { required: true })}
                <Field label="Discount Type"><Select value={form.discount_type} onChange={set('discount_type')} options={[{ id: 'fixed', name: 'Fixed' }, { id: 'percent', name: 'Percent' }]} /></Field>
                {num('discount_price', 'Discount')}
                {num('stock', 'Current Stock Quantity')}
            </div></Section>
            <Section title="Upload or Add Product Video">
                <Field label="Select Video Type"><Select value={form.video_type} onChange={set('video_type')} options={[{ id: 'file', name: 'Upload Video File' }, { id: 'youtube', name: 'YouTube Link' }, { id: 'vimeo', name: 'Vimeo Link' }, { id: 'dailymotion', name: 'Dailymotion Link' }]} /></Field>
                {form.video_type === 'file' ? <Field label="Upload Product Video"><input type="file" accept="video/*" className="text-[13px]" /></Field> : <Field label="Video Link"><TextArea value={form.video_url} onChange={set('video_url')} placeholder="Paste the video link" /></Field>}
            </Section>
            <Section title="SEO Information">
                <Field label="Meta Title"><TextInput value={form.meta_title} onChange={set('meta_title')} placeholder="Meta Title" /></Field>
                <Field label="Meta Description"><TextArea value={form.meta_description} onChange={set('meta_description')} placeholder="Meta Description" /></Field>
                <Field label="Meta Keywords"><TagInput value={form.meta_keywords} onChange={set('meta_keywords')} placeholder="Write keywords and Press enter to add new one" /></Field>
            </Section>
            <FormActions saving={saving} onReset={id ? undefined : reset} back="/admin/products" />
        </form>
    );
}
