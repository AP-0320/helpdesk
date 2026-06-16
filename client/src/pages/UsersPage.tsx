import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UsersTable, { type User } from "@/components/UsersTable";
import UserDialog from "@/components/UserDialog";
import DeleteUserDialog from "@/components/DeleteUserDialog";

export default function UsersPage() {
  const [dialogState, setDialogState] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>All registered users in the system</CardDescription>
          <CardAction>
            <Button size="sm" onClick={() => setDialogState({ open: true, user: null })}>
              <Plus className="size-4" />
              Add User
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="p-0">
          <UsersTable
            onEdit={(user) => setDialogState({ open: true, user })}
            onDelete={setDeleteUser}
          />
        </CardContent>
      </Card>

      <UserDialog
        key={dialogState.user?.id ?? "new"}
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
        user={dialogState.user}
      />
      <DeleteUserDialog
        open={deleteUser !== null}
        onOpenChange={(open) => { if (!open) setDeleteUser(null) }}
        user={deleteUser}
      />
    </>
  );
}
