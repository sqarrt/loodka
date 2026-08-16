'use client';

import { useActionState } from 'react';
import { createCase } from '@/app/actions/create-case';

const emptyItems = [0, 1]; // start with 2 item rows

export default function NewCasePage() {
  const [state, formAction] = useActionState(createCase, null);

  return (
    <main>
      <h1>Создать кейс</h1>
      <form action={formAction}>
        <label>
          Название
          <input name="title" required />
        </label>
        <label>
          Цена крутки (лудки)
          <input name="price" type="number" min={1} defaultValue={10} required />
        </label>
        <fieldset>
          <legend>Предметы</legend>
          {emptyItems.map((i) => (
            <div key={i}>
              <input name="itemName" placeholder="Название предмета" required />
              <input name="itemWeight" type="number" min={1} defaultValue={1} required />
              <input name="itemImage" type="file" accept="image/*" required />
            </div>
          ))}
        </fieldset>
        {state?.error && <p role="alert">{state.error}</p>}
        <button type="submit">Создать</button>
      </form>
    </main>
  );
}
