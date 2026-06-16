import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { createUserSchema, updateUserSchema, type CreateUserData } from "@helpdesk/core"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { User } from "@/components/UsersTable"

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
}

export default function UserDialog({ open, onOpenChange, user }: UserDialogProps) {
  const isEdit = user !== null
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<CreateUserData>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
  })

  useEffect(() => {
    if (open) {
      reset(isEdit ? { name: user.name, email: user.email, password: "" } : undefined)
    } else {
      reset()
    }
  }, [open, isEdit, user, reset])

  function moveCursorToEnd(e: React.FocusEvent<HTMLInputElement>) {
    const el = e.target
    setTimeout(() => el.setSelectionRange(el.value.length, el.value.length), 0)
  }

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateUserData) =>
      isEdit
        ? axios.patch(`/api/users/${user.id}`, data, { withCredentials: true })
        : axios.post("/api/users", data, { withCredentials: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      onOpenChange(false)
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setError("root", {
          message: err.response?.data?.error ?? "Something went wrong",
        })
      }
    },
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="px-6 py-5 border-b border-border">
          <SheetTitle>{isEdit ? "Edit user" : "Add new user"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the user's details. Leave the password blank to keep the current one."
              : "Create a new agent account. They can sign in immediately with these credentials."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit((data) => mutate(data))}
          noValidate
          className="flex flex-col gap-5 px-6 py-6 flex-1"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-name">Name</Label>
            <Input
              id="user-name"
              type="text"
              placeholder="Jane Smith"
              aria-invalid={!!errors.name}
              onFocus={moveCursorToEnd}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="jane@example.com"
              aria-invalid={!!errors.email}
              onFocus={moveCursorToEnd}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-password">
              Password{isEdit && <span className="text-muted-foreground"> (optional)</span>}
            </Label>
            <Input
              id="user-password"
              type="password"
              placeholder={isEdit ? "Leave blank to keep current" : "••••••••"}
              aria-invalid={!!errors.password}
              onFocus={moveCursorToEnd}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}

          <div className="flex justify-end gap-2 mt-auto pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEdit ? "Saving…" : "Creating…"
                : isEdit ? "Save changes" : "Create user"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
