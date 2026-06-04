// src/components/shared/CustomerContactsList.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Phone, Trash2, UserCog } from "lucide-react";
import {
  addContactAction,
  removeContactAction,
} from "@/app/(dashboard)/customers/actions";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  phone: string;
  role: string;
}

export function CustomerContactsList({
  customerId,
  contacts,
}: {
  customerId: string;
  contacts: Contact[];
}) {
  const [isAdding, setIsAdding] = useState(false);

  const handleDelete = async (contactId: string) => {
    const res = await removeContactAction(customerId, contactId);
    if (res.success) toast.success("Contacto eliminado");
  };

  return (
    <Card className="shadow-sm border-blue-50 h-full">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <UserCog className="h-5 w-5 text-blue-700" /> Contactos del Cliente
        </CardTitle>
        <Button
          size="sm"
          variant="ghost"
          className="text-blue-700 font-bold"
          onClick={() => setIsAdding(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" /> Agregar
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-3">
          {contacts.length > 0 ? (
            contacts.map((contact) => (
              <div
                key={contact.id}
                className="group flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/30 hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-900">
                    {contact.name}
                  </span>
                  <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-tighter">
                    {contact.role}
                  </span>
                  <div className="flex items-center gap-1 mt-1 text-gray-500">
                    <Phone className="h-3 w-3" />
                    <span className="text-xs font-medium">{contact.phone}</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={`tel:${contact.phone}`}>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-green-600 border-green-100 bg-green-50"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-red-600 border-red-100 bg-red-50"
                    onClick={() => handleDelete(contact.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-xs text-gray-400 italic">
                Sin contactos registrados.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
