import React, { useEffect, useState } from 'react';
import getServerSchedules, { Schedule } from '@/api/server/schedules/getServerSchedules';
import { ServerContext } from '@/state/server';
import Spinner from '@/components/elements/Spinner';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt } from '@fortawesome/free-solid-svg-icons/faCalendarAlt';
import classNames from 'classnames';
import format from 'date-fns/format';
import FlashMessageRender from '@/components/FlashMessageRender';
import { Actions, useStoreActions } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import { httpErrorToHuman } from '@/api/http';

export default () => {
    const { id, uuid } = ServerContext.useStoreState(state => state.server.data!);
    const [ schedules, setSchedules ] = useState<Schedule[] | null>(null);

    const { addError, clearFlashes } = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);

    useEffect(() => {
        clearFlashes('schedules');
        getServerSchedules(uuid)
            .then(schedules => setSchedules(schedules))
            .catch(error => {
                addError({ message: httpErrorToHuman(error), key: 'schedules' });
                console.error(error);
            });
    }, [ uuid, setSchedules ]);

    return (
        <div className={'my-10 mb-6'}>
            <FlashMessageRender byKey={'schedules'} className={'mb-4'}/>
            {!schedules ?
                <Spinner size={'large'} centered={true}/>
                :
                schedules.map(schedule => (
                    <Link key={schedule.id} to={`/servers/${id}/schedules/${schedule.id}`} className={'grey-row-box'}>
                        <div className={'icon'}>
                            <FontAwesomeIcon icon={faCalendarAlt} fixedWidth={true}/>
                        </div>
                        <div className={'flex-1 ml-4'}>
                            <p>{schedule.name}</p>
                            <p className={'text-xs text-neutral-400'}>
                                Last run at: {schedule.lastRunAt ? format(schedule.lastRunAt, 'MMM Do [at] h:mma') : 'never'}
                            </p>
                        </div>
                        <div className={'flex items-center mx-8'}>
                            <div>
                                <p className={'font-medium text-center'}>{schedule.cron.minute}</p>
                                <p className={'text-2xs text-neutral-500 uppercase'}>Minute</p>
                            </div>
                            <div className={'ml-4'}>
                                <p className={'font-medium text-center'}>{schedule.cron.hour}</p>
                                <p className={'text-2xs text-neutral-500 uppercase'}>Hour</p>
                            </div>
                            <div className={'ml-4'}>
                                <p className={'font-medium text-center'}>{schedule.cron.dayOfMonth}</p>
                                <p className={'text-2xs text-neutral-500 uppercase'}>Day (Month)</p>
                            </div>
                            <div className={'ml-4'}>
                                <p className={'font-medium text-center'}>*</p>
                                <p className={'text-2xs text-neutral-500 uppercase'}>Month</p>
                            </div>
                            <div className={'ml-4'}>
                                <p className={'font-medium text-center'}>{schedule.cron.dayOfWeek}</p>
                                <p className={'text-2xs text-neutral-500 uppercase'}>Day (Week)</p>
                            </div>
                        </div>
                        <div>
                            <p className={classNames('py-1 px-3 rounded text-xs uppercase', {
                                'bg-green-600': schedule.isActive,
                                'bg-neutral-400': !schedule.isActive,
                            })}>
                                {schedule.isActive ? 'Active' : 'Inactive'}
                            </p>
                        </div>
                    </Link>
                ))
            }
        </div>
    );
};
