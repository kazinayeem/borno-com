import React from 'react';
import { useParams } from 'react-router-dom';
import { Icon } from '../../components/ui';

export default function Soon() {
    const { name } = useParams();
    return (
        <div className="card grid place-items-center rounded-xl !border-[#f4f4f4] py-24 text-center">
            <Icon name="box" size={44} className="text-gray-300" />
            <h2 className="mt-3 text-lg font-semibold capitalize">{name.replace(/-/g, ' ')}</h2>
            <p className="mt-1 text-sm text-muted">This section exists in the reference admin but is not built in this clone yet.</p>
        </div>
    );
}
