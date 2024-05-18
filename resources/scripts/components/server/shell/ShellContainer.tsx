import { Actions, useStoreActions } from 'easy-peasy';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import FlashMessageRender from '@/components/FlashMessageRender';
import { MainPageHeader } from '@/components/elements/MainPageHeader';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { Dialog } from '@/components/elements/dialog';
import HugeIconsEggs from '@/components/elements/hugeicons/Egg';
import HugeIconsAlert from '@/components/elements/hugeicons/Alert';

import { httpErrorToHuman } from '@/api/http';
import getNests from '@/api/nests/getNests';
import reinstallServer from '@/api/server/reinstallServer';
import setSelectedEggImage from '@/api/server/setSelectedEggImage';
import getServerBackups from '@/api/swr/getServerBackups';
import createServerBackup from '@/api/server/backups/createServerBackup';

import { ApplicationStore } from '@/state';
import { ServerContext } from '@/state/server';
import { Switch } from '@/components/elements/SwitchV2';
import Button from '@/components/elements/ButtonV2';

interface Egg {
    object: string;
    attributes: {
        uuid: string;
        name: string;
        description: string;
    };
}

interface Nest {
    object: string;
    attributes: {
        id: number;
        uuid: string;
        author: string;
        name: string;
        description: string;
        created_at: string;
        updated_at: string;
        relationships: {
            eggs: {
                object: string;
                data: Egg[];
            };
        };
    };
}

const MAX_DESCRIPTION_LENGTH = 100;
const steps = [
    {
        slug: 'game',
        title: 'Game',
    },
    {
        slug: 'sofware',
        title: 'Sofware',
    },
    {
        slug: 'options-variables',
        title: 'Options & Variables',
    }
]
const hidden_nests = ['Pyro']; // Hardcoded
const blankEggId = 'ab151eec-ab55-4de5-a162-e8ce854b3b60'; // Hardcoded change for prod

const ShellContainer = () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const [nests, setNests] = useState<Nest | null>(null);
    const eggs = nests?.reduce((eggArray, nest) => [...eggArray, ...nest.attributes.relationships.eggs.data], [] as Egg[]);
    const currentEgg = ServerContext.useStoreState((state) => state.server.data!.egg);
    const currentEggName = nests && nests.find((nest) => nest.attributes.relationships.eggs.data.find((egg) => egg.attributes.uuid === currentEgg))?.attributes.relationships.eggs.data.find((egg) => egg.attributes.uuid === currentEgg)?.attributes.name;
    const backupLimit = ServerContext.useStoreState((state) => state.server.data!.featureLimits.backups);
    const { data: backups } = getServerBackups();

    const [step, setStep] = useState(steps[0] && currentEgg === blankEggId ? 1 : 0);
    const [modalVisible, setModalVisible] = useState(false);
    const [visible, setVisible] = useState(false);

    const [shouldBackup, setShouldBackup] = useState(false);
    const [selectedNest, setSelectedNest] = useState<Nest | null>(null);
    const [selectedEgg, setSelectedEgg] = useState<Egg | null>(null);
    const [showFullDescriptions, setShowFullDescriptions] = useState<boolean[]>([]);

    const { addFlash, clearFlashes } = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);

    useEffect(() => {
        const fetchData = async () => {
            const data = await getNests();
            setNests(data);
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (backups) {
            if (backupLimit <= 0 || backups.backupCount >= backupLimit) {
                setShouldBackup(false);
            }
        }
    }, [backups, backupLimit]);

    const reinstall = () => {
        clearFlashes('shell');
        reinstallServer(uuid)
            .then(() => {
                addFlash({
                    key: 'shell',
                    type: 'success',
                    message: 'Your servers egg has changed and the reinstallation process has begun.',
                });
            })
            .catch((error) => {
                console.error(error);
                addFlash({ key: 'shell', type: 'error', message: httpErrorToHuman(error) });
            })
    };

    const handleNestSelect = (nest: Nest) => {
        setSelectedNest(nest);
        setSelectedEgg(null);
    };

    const changeEgg = (eggId: number, nestId: number) => {
        setSelectedEggImage(uuid, eggId, nestId)
        .then(() => {
            reinstall();
            setModalVisible(false);
        })
        .catch((error) => {
            console.error(error);
            addFlash({ key: 'shell', type: 'error', message: httpErrorToHuman(error) });
        });
    };

    const confirmSelection = () => {
        const nestId = nests?.find((nest) => nest.attributes.relationships.eggs.data.find((egg) => egg.attributes.uuid === selectedEgg?.attributes.uuid))?.attributes.id;
        const eggId = eggs?.findIndex((egg) => egg.attributes.uuid === selectedEgg?.attributes.uuid) + 1 || 0;
        
        if (shouldBackup) {
            createServerBackup(uuid, {name: `${selectedEgg?.attributes.name} Migration - ${new Date().toLocaleString()}`, isLocked: false})
                .then(() => {
                    changeEgg(eggId, nestId);
                })
                .catch((error) => {
                    toast.error(httpErrorToHuman(error));
                });
        } else if (shouldBackup === false) {
            changeEgg(eggId, nestId);
        }
        
    };

    const handleEggSelect = (egg: Egg) => {
        setSelectedEgg(egg);
        setModalVisible(true);
    };
    
    const toggleDescriptionVisibility = (index: number) => {
        setShowFullDescriptions((prev) => {
            const newVisibility = [...prev];
            newVisibility[index] = !newVisibility[index];
            return newVisibility;
        });
    };

    const renderEggDescription = (description: string, index: number) => {
        const isLongDescription = description.length > MAX_DESCRIPTION_LENGTH;
        const shouldShowFull = showFullDescriptions[index];

        return (
            <div>
                {isLongDescription && !shouldShowFull ? (
                    <>
                        {`${description.slice(0, MAX_DESCRIPTION_LENGTH)}... `}
                        <button onClick={() => toggleDescriptionVisibility(index)}>Show More</button>
                    </>
                ) : (
                    <>
                        {description}
                        {isLongDescription && (
                            <button onClick={() => toggleDescriptionVisibility(index)}>..Show Less</button>
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <ServerContentBlock title='Shell'>
            <FlashMessageRender byKey='Shell' />
            <MainPageHeader direction='column' title='Shell'>
                <h2 className='text-sm'>
                The shell is a powerful tool that allows you to edit your server egg.
                </h2>
            </MainPageHeader>

            <Dialog.Confirm
                open={modalVisible}
                title={'Confirm server reinstallation'}
                confirm={'Yes, reinstall server'}
                onClose={() => setModalVisible(false)}
                onConfirmed={() => confirmSelection()}
            >
                Your server will be stopped and some files may be deleted or modified during this process, are you sure
                you wish to continue?
            </Dialog.Confirm>
            
            <div className='relative rounded-xl overflow-hidden shadow-md border-[1px] border-[#ffffff07] bg-[#ffffff08]'>
                <div className='w-full h-full'>
                    <div className='flex items-center justify-between pb-4 p-2'>
                        <div className='flex items-center gap-2'>
                            <HugeIconsEggs fill='currentColor' />
                            <div className='flex flex-col'>
                                <h1 className='text-2xl'>Current Egg</h1>
                                {currentEggName}
                            </div>
                        </div>
                        {!visible && (
                            <button
                                className='rounded-full border-[1px] border-[#ffffff12] px-4 py-2 text-sm font-bold shadow-md hover:border-[#ffffff22] hover:shadow-lg bg-gradient-to-b from-[#ffffff10] to-[#ffffff09] text-white'
                                onClick={() => setVisible(true)}
                            >
                                Change Egg
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            {visible && (
            <div className='relative rounded-xl overflow-hidden shadow-md border-[1px] border-[#ffffff07] bg-[#ffffff08] mt-6 h-[52svh]'>
                <div className='w-full h-full'>
                    <div className='flex items-center justify-between p-4 pr-5 mb-2'>
                        {steps.map((cstep, index) => index <= 0 && currentEgg === blankEggId ? null : (
                            <div key={cstep.slug}>
                                <div className='flex items-center gap-2' onClick={() => setStep(index)} style={{ cursor: 'pointer' }}>
                                    <div className={`${index < step+1 ? 'border-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#FF343C] to-[#F06F53] text-brand' : 'border-[#ffffff20] text-[#ffffff20]'} border-[2px] rounded-full p-1 w-8 h-8 text-sm font-bold shadow-md hover:shadow-lg items-center text-center`}>
                                        {index + 1}
                                    </div>
                                    <h2  className={`${index < step+1 ? 'text-white' : 'text-[#ffffff20]'} text-sm font-bold`}>{cstep.title}</h2>
                                    {index !== steps.length - 1 && <div className={`${index < step ? 'border-brand' : 'border-[#ffffff12]'} border-t-2 border-dashed ml-4 w-[430px]`}></div>}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className='border-t border-[#ffffff20] m-4 mt-0 mb-0'></div>

                    <div className='p-4 pt-2'>
                        {step == 0 && (
                        <div>
                            <div className='grid grid-cols-3 gap-4 mt-4'>
                                {nests?.map((nest) => hidden_nests.includes(nest.attributes.name) ? null : (
                                    <div
                                        key={nest.attributes.uuid}
                                        className={`cursor-pointer bg-[#0f0f0f] border-[1px] p-4 rounded-lg w-full text-left ${
                                            selectedNest?.attributes.uuid === nest.attributes.uuid ? 'border-[#555555ef]' : 'border-[#55555540]'
                                        }`}
                                    >
                                        <div className='flex items-center justify-between'>
                                            <p className='text-neutral-200 text-md'>{nest.attributes.name}</p>
                                            <Button
                                                onClick={() => handleNestSelect(nest)}
                                            >
                                                Select
                                            </Button>
                                        </div>
                                        <p className='text-neutral-400 text-xs mt-2'>{nest.attributes.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        )}

                        {step == 1 && selectedNest && (
                            <div>
                                <div className='grid grid-cols-3 gap-4 mt-4'>
                                    {selectedNest.attributes.relationships.eggs.data.map((egg, eggIndex) => currentEgg === egg.attributes.uuid ? null :(
                                        <div
                                            key={egg.attributes.uuid}
                                            className='cursor-pointer border border-neutral-800 hover:border-neutral-700 p-4 rounded-lg bg-[#0f0f0f] w-full'
                                        >
                                            <div className='flex items-center justify-between'>
                                                <p className='text-neutral-300 text-md'>{egg.attributes.name}</p>
                                                <Button
                                                    onClick={() => handleEggSelect(egg)}
                                                >
                                                    Select
                                                </Button>
                                            </div>
                                            <p className='text-neutral-300 text-xs mt-2'>{renderEggDescription(egg.attributes.description, eggIndex)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) || step == 1 && (
                            <div className='flex items-center justify-center h-100%'>
                                <p className='text-neutral-300'>Please select a game first</p>
                            </div>
                        )}

                        {step == 2 && currentEgg !== blankEggId && (
                            <div className='grid grid-cols-2 gap-4 mt-4'>
                                <div className='flex items-center justify-between gap-2 bg-[#0000002a] border-[1px] border-[#ffffff0e] p-4 rounded-lg'>
                                    <div className='flex flex-col'>
                                        <label htmlFor='backup' className='text-neutral-300 text-md font-bold'>Backups</label>
                                        <label htmlFor='backup' className='text-neutral-500 text-sm font-semibold'>Would you like to create a backup before continuing? Some data may be modified for removed during the process.</label>
                                    </div>
                                    <Switch 
                                        name='backup'
                                        defaultChecked={shouldBackup}
                                        onCheckedChange={() => setShouldBackup(!shouldBackup)} 
                                    />
                                </div>
                                <div className='flex items-center justify-between gap-2 bg-[#0000002a] border-[1px] border-[#ffffff0e] p-4 rounded-lg'>
                                    <div className='flex flex-col'>
                                        <label htmlFor='backup' className='text-neutral-300 text-md font-bold'>Wipe Data</label>
                                        <label htmlFor='backup' className='text-neutral-500 text-sm font-semibold'>In some cases you might want to completely wipe  your server like if you are changing to a different game.</label>
                                    </div>
                                    <Switch />
                                </div>
                            </div>
                        )}
                    </div>
                </div>  
            </div>
            )}

            <div className='relative rounded-xl overflow-hidden shadow-md border-[1px] border-[#ffffff07] bg-[#ffffff08] mt-6 p-1 flex flex-row justify-between items-center'>
                <div className='flex flex-row items-center gap-2'>
                    <HugeIconsAlert fill='currentColor' className='pl-1 text-brand' />
                    <div className='flex flex-col pb-1'>
                        <h1 className='text-xl'>Danger Zone</h1>
                        <p className='text-sm text-neutral-300'>During this process some files may be deleted or modified either make a backup before hand or pick the option when prompted.</p>
                    </div>
                </div>
            </div>
        </ServerContentBlock>
    );
};

export default ShellContainer;