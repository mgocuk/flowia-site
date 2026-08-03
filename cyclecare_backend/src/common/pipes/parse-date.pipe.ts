import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { parseISO, isValid } from 'date-fns';

@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  transform(value: string): Date {
    if (!value) return null as any;
    
    const parsedDate = parseISO(value);
    if (!isValid(parsedDate)) {
      throw new BadRequestException('Validation failed (valid ISO 8601 date string is expected)');
    }
    return parsedDate;
  }
}
