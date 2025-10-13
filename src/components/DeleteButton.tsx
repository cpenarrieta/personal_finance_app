'use client'

export function DeleteButton({
  id,
  action,
  confirmMessage,
  buttonText = 'Delete',
  className = 'text-red-600 hover:text-red-800 text-sm',
}: {
  id: string
  action: (formData: FormData) => Promise<void>
  confirmMessage: string
  buttonText?: string
  className?: string
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={className}
        onClick={(e) => {
          if (!confirm(confirmMessage)) {
            e.preventDefault()
          }
        }}
      >
        {buttonText}
      </button>
    </form>
  )
}

