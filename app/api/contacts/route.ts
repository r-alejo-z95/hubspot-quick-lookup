import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const isReviewed = searchParams.get('isReviewed');

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId is required' },
        { status: 400 }
      );
    }

    const where: any = { eventId };
    if (isReviewed !== null) {
      where.isReviewed = isReviewed === 'true';
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contacts, eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: 'Contacts array is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Obtener emails existentes en el evento
    const existingEmails = await prisma.contact.findMany({
      where: { eventId },
      select: { email: true },
    });

    const existingEmailSet = new Set(existingEmails.map((c) => c.email.toLowerCase()));

    // Filtrar solo contactos nuevos (no duplicados)
    const newContacts = contacts.filter(
      (contact: any) => !existingEmailSet.has((contact.email || '').toLowerCase())
    );

    let createdCount = 0;

    if (newContacts.length > 0) {
      const result = await prisma.contact.createMany({
        data: newContacts.map((contact: any) => ({
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.email || '',
          registrationDate: contact.registrationDate || null,
          lastModifiedDate: contact.lastModifiedDate || null,
          cancellationDate: contact.cancellationDate || null,
          attendeeCategory: contact.attendeeCategory || null,
          registrationStatus: contact.registrationStatus || null,
          eventId,
        })),
      });
      createdCount = result.count;
    }

    return NextResponse.json(
      {
        createdCount,
        newCount: newContacts.length,
        duplicates: contacts.length - newContacts.length,
        message: `Importados ${newContacts.length} contactos nuevos. ${contacts.length - newContacts.length} duplicados ignorados.`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating contacts:', error);
    return NextResponse.json(
      { error: 'Failed to create contacts' },
      { status: 500 }
    );
  }
}
