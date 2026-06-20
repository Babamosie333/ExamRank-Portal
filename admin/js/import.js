(async function () {
  await requireAuth();
  const alertEl = document.getElementById('alert');
  const summaryEl = document.getElementById('summary');

  document.getElementById('importForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    alertEl.innerHTML = '';
    summaryEl.classList.add('hidden');

    const fileInput = document.getElementById('file');
    if (!fileInput.files[0]) {
      showAlert(alertEl, 'Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('status', 'active'); // or '1' if your backend uses 1 = active

    try {
      const res = await fetch('/api/questions/import-excel', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      summaryEl.classList.remove('hidden');
      summaryEl.innerHTML = `
        <h3>Import Summary</h3>
        <p><strong>Total rows:</strong> ${data.totalRows}</p>
        <p><strong>Success:</strong> ${data.successCount}</p>
        <p><strong>Failed:</strong> ${data.failedCount}</p>
        ${
          data.failedRows?.length
            ? `<div class="failed-rows"><strong>Failed rows:</strong><ul>${data.failedRows
                .map((r) => `<li>Row ${r.row}: ${r.errors.join(', ')}</li>`)
                .join('')}</ul></div>`
            : ''
        }`;
      showAlert(alertEl, 'Import completed', 'success');
      fileInput.value = '';
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });
})();
