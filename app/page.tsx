'use client';

import { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  registrationDate: string | null;
  lastModifiedDate: string | null;
  cancellationDate: string | null;
  attendeeCategory: string | null;
  registrationStatus: string | null;
  isReviewed: boolean;
  eventId: string;
}

interface Event {
  id: string;
  name: string;
  description: string | null;
  _count?: { contacts: number };
}

type SortField = keyof Contact;
type SortOrder = 'asc' | 'desc';

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReviewed, setShowReviewed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [sortField, setSortField] = useState<SortField>('firstName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [loading, setLoading] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [importMessage, setImportMessage] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar eventos al montar
  useEffect(() => {
    fetchEvents();
  }, []);

  // Cargar contactos cuando se selecciona un evento
  useEffect(() => {
    if (selectedEventId) {
      fetchContacts();
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      setEvents(data);
      if (data.length > 0 && !selectedEventId) {
        setSelectedEventId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchContacts = async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/contacts?eventId=${selectedEventId}`);
      const data = await response.json();
      setContacts(data);
      setSearchTerm('');
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEventName.trim()) {
      alert('El nombre del evento es requerido');
      return;
    }

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEventName,
          description: newEventDescription,
        }),
      });

      if (response.ok) {
        setNewEventName('');
        setNewEventDescription('');
        setIsCreatingEvent(false);
        fetchEvents();
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Error al crear el evento');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processCSV = async (file: File) => {
    if (!selectedEventId) {
      alert('Selecciona un evento primero');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedContacts = results.data
          .map((row: any) => ({
            firstName: row['First Name'] || row['first name'] || row.firstName || '',
            lastName: row['Last Name'] || row['last name'] || row.lastName || '',
            email: row.Email || row.email || row.EMAIL || '',
            registrationDate: convertDateFormat(row['Registration Date'] || row['registration date']) || null,
            lastModifiedDate: convertDateFormat(row['Last Modified Date'] || row['last modified date']) || null,
            cancellationDate: convertDateFormat(row['Cancellation Date'] || row['cancellation date']) || null,
            attendeeCategory: row['Attendee Category'] || row['attendee category'] || null,
            registrationStatus: row['Registration Status'] || row['registration status'] || null,
          }))
          .filter((contact) => contact.email || contact.firstName);

        // Guardar en la base de datos
        try {
          const response = await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contacts: parsedContacts,
              eventId: selectedEventId,
            }),
          });

          const result = await response.json();

          if (response.ok) {
            setImportMessage({
              message: result.message,
              type: result.newCount > 0 ? 'success' : 'info',
            });
            // Limpiar mensaje después de 5 segundos
            setTimeout(() => setImportMessage(null), 5000);
            fetchContacts();
          } else {
            setImportMessage({
              message: result.error || 'Error al guardar los contactos',
              type: 'error',
            });
          }
        } catch (error) {
          console.error('Error saving contacts:', error);
          setImportMessage({
            message: 'Error al guardar los contactos',
            type: 'error',
          });
        }
      },
      error: (error) => {
        alert(`Error parsing CSV: ${error.message}`);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        processCSV(file);
      } else {
        alert('Por favor sube un archivo CSV');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      processCSV(files[0]);
    }
  };

  const toggleReviewed = async (id: string, currentIsReviewed: boolean) => {
    try {
      // Actualizar estado local inmediatamente
      setContacts(
        contacts.map((c) =>
          c.id === id ? { ...c, isReviewed: !c.isReviewed } : c
        )
      );

      const response = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isReviewed: !currentIsReviewed }),
      });

      if (!response.ok) {
        // Si falla, revertir el cambio
        setContacts(
          contacts.map((c) =>
            c.id === id ? { ...c, isReviewed: currentIsReviewed } : c
          )
        );
        console.error('Error updating contact');
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      // Revertir el cambio en caso de error
      setContacts(
        contacts.map((c) =>
          c.id === id ? { ...c, isReviewed: currentIsReviewed } : c
        )
      );
    }
  };

  const toggleSelectContact = (id: string) => {
    const newSelected = new Set(selectedContactIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedContactIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedContactIds.size === filteredContacts.length) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  const reviewSelected = async () => {
    if (selectedContactIds.size === 0) {
      alert('Selecciona al menos un contacto');
      return;
    }

    try {
      // Determinar el nuevo estado basado en la pestaña actual
      const newReviewedState = !showReviewed;

      // Actualizar UI inmediatamente
      setContacts(
        contacts.map((c) =>
          selectedContactIds.has(c.id) ? { ...c, isReviewed: newReviewedState } : c
        )
      );

      // Actualizar en la BD
      await Promise.all(
        Array.from(selectedContactIds).map((id) =>
          fetch(`/api/contacts/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isReviewed: newReviewedState }),
          })
        )
      );

      // Limpiar selección
      setSelectedContactIds(new Set());
    } catch (error) {
      console.error('Error reviewing contacts:', error);
      alert('Error al cambiar estado de los contactos');
      // Recargar para revertir cambios
      fetchContacts();
    }
  };

  const convertDateFormat = (dateStr: string | null) => {
    if (!dateStr) return null;
    // Convierte dd/mm/yyyy a yyyy-mm-dd para que se guarde en BD correctamente
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr; // Si ya está en otro formato, deja como está
  };

  const openHubSpotSearch = (email: string, firstName: string, lastName: string) => {
    const fullName = `${firstName} ${lastName}`.trim();
    const query = email || fullName;
    if (!query) return;

    const hubspotUrl = `https://app.hubspot.com/search/6832097/search?query=${encodeURIComponent(query)}`;
    window.open(hubspotUrl, '_blank');
  };

  // Filtrar y ordenar contactos
  const filteredContacts = contacts
    .filter((contact) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        contact.firstName.toLowerCase().includes(searchLower) ||
        contact.lastName.toLowerCase().includes(searchLower) ||
        contact.email.toLowerCase().includes(searchLower)
      );
    })
    .filter((contact) => contact.isReviewed === showReviewed)
    .sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';

      let comparison = 0;
      if (typeof aVal === 'string') {
        comparison = aVal.localeCompare(bVal as string);
      } else {
        comparison = (aVal as any) > (bVal as any) ? 1 : -1;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">StovaSpot</h1>
          <p className="text-gray-600">Gestiona tus listas de contactos por evento</p>
        </div>

        {/* Eventos */}
        <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Eventos</h2>
            <button
              onClick={() => setIsCreatingEvent(!isCreatingEvent)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              {isCreatingEvent ? 'Cancelar' : 'Nuevo Evento'}
            </button>
          </div>

          {isCreatingEvent && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Nombre del evento"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
                <textarea
                  placeholder="Descripción (opcional)"
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  rows={3}
                />
              </div>
              <button
                onClick={handleCreateEvent}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Crear Evento
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => setSelectedEventId(event.id)}
                className={`p-4 rounded-lg transition-all text-left ${
                  selectedEventId === event.id
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                <h3 className="font-bold">{event.name}</h3>
                <p className="text-sm opacity-75">
                  {event._count?.contacts || 0} contactos
                </p>
              </button>
            ))}
          </div>
        </div>

        {selectedEventId && (
          <>
            {/* Import Message */}
            {importMessage && (
              <div
                className={`mb-6 p-4 rounded-lg font-medium ${
                  importMessage.type === 'success'
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : importMessage.type === 'info'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}
              >
                {importMessage.message}
              </div>
            )}

            {/* Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all mb-8 cursor-pointer ${
                isDragging
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-300 bg-white hover:border-indigo-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-2"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v28a4 4 0 004 4h24a4 4 0 004-4V20m-16-12v16m0 0l-4-4m4 4l4-4"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <p className="text-lg font-medium text-gray-900 mb-1">
                  Arrastra tu CSV aquí o haz clic
                </p>
                <p className="text-sm text-gray-500">
                  Soporta archivos CSV exportados de Stova
                </p>
              </div>
            </div>

            {/* Tabs */}
            {contacts.length > 0 && (
              <div className="mb-6 flex gap-4 flex-wrap">
                <button
                  onClick={() => setShowReviewed(false)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    !showReviewed
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Sin revisar ({contacts.filter((c) => !c.isReviewed).length})
                </button>
                <button
                  onClick={() => setShowReviewed(true)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    showReviewed
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Revisados ({contacts.filter((c) => c.isReviewed).length})
                </button>
                {selectedContactIds.size > 0 && (
                  <button
                    onClick={reviewSelected}
                    className={`px-6 py-2 rounded-lg transition-colors font-medium ml-auto ${
                      showReviewed
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {showReviewed ? 'Desrevisar' : 'Revisar'} {selectedContactIds.size} seleccionado{selectedContactIds.size !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            )}

            {/* Search */}
            {contacts.length > 0 && (
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
            )}

            {/* Table */}
            {loading ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-lg">
                <p className="text-gray-500 text-lg">Cargando...</p>
              </div>
            ) : filteredContacts.length > 0 ? (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-6 py-4 bg-indigo-600 text-white">
                  <p className="font-semibold">
                    Mostrando {filteredContacts.length} de {contacts.length} contacto
                    {contacts.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left font-medium text-gray-700">
                          <input
                            type="checkbox"
                            checked={selectedContactIds.size === filteredContacts.length && filteredContacts.length > 0}
                            onChange={toggleSelectAll}
                            className="rounded cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">
                          <button
                            onClick={() => handleSort('firstName')}
                            className="hover:text-indigo-600"
                          >
                            Nombre {sortField === 'firstName' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">
                          <button
                            onClick={() => handleSort('lastName')}
                            className="hover:text-indigo-600"
                          >
                            Apellido {sortField === 'lastName' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">
                          <button
                            onClick={() => handleSort('email')}
                            className="hover:text-indigo-600"
                          >
                            Email {sortField === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">
                          <button
                            onClick={() => handleSort('registrationDate')}
                            className="hover:text-indigo-600"
                          >
                            Fecha {sortField === 'registrationDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">
                          <button
                            onClick={() => handleSort('registrationStatus')}
                            className="hover:text-indigo-600"
                          >
                            Status {sortField === 'registrationStatus' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">
                          <button
                            onClick={() => handleSort('attendeeCategory')}
                            className="hover:text-indigo-600"
                          >
                            Categoría {sortField === 'attendeeCategory' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredContacts.map((contact) => (
                        <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedContactIds.has(contact.id)}
                              onChange={() => toggleSelectContact(contact.id)}
                              className="rounded cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 text-gray-900">{contact.firstName}</td>
                          <td className="px-4 py-3 text-gray-900">{contact.lastName}</td>
                          <td className="px-4 py-3 text-gray-600 break-all">{contact.email}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            {contact.registrationDate || '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{contact.registrationStatus || '-'}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{contact.attendeeCategory || '-'}</td>
                          <td className="px-4 py-3 text-sm space-y-2">
                            <button
                              onClick={() =>
                                openHubSpotSearch(contact.email, contact.firstName, contact.lastName)
                              }
                              className="block w-full px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                            >
                              HubSpot
                            </button>
                            <button
                              onClick={() => toggleReviewed(contact.id, contact.isReviewed)}
                              className={`block w-full px-3 py-1 rounded transition-colors ${
                                contact.isReviewed
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                              }`}
                            >
                              {contact.isReviewed ? '✓ Desrevisar' : 'Revisar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow-lg">
                <p className="text-gray-500 text-lg">
                  {contacts.length === 0
                    ? 'Sube un archivo CSV para comenzar'
                    : 'No hay contactos para mostrar'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
